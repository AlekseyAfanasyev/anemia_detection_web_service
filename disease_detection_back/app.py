import joblib
import os
from datetime import datetime, timedelta
import numpy as np

from sqlalchemy import func
from sqlalchemy import or_
from funcs import *
from db import db, User, Checkup, Role, OAK_Checkup, Biochem
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import logging
from dotenv import load_dotenv
from flask_session import Session
from minio import Minio
from minio.error import S3Error
import uuid

load_dotenv()
app = Flask(__name__)

minio_client = Minio(
    os.getenv('MINIO_ENDPOINT'),
    access_key=os.getenv('MINIO_ACCESS_KEY'),
    secret_key=os.getenv('MINIO_SECRET_KEY'),
    secure=os.getenv('MINIO_SECURE', 'False').lower() == 'true'
)
MINIO_BUCKET_NAME = os.getenv('MINIO_BUCKET_NAME', 'user-photos')

def ensure_minio_bucket_exists():
    try:
        if not minio_client.bucket_exists(MINIO_BUCKET_NAME):
            minio_client.make_bucket(MINIO_BUCKET_NAME)
            logging.info(f"Bucket {MINIO_BUCKET_NAME} создан успешно")
    except S3Error as e:
        logging.error(f"Ошибка при создании bucket: {e}")

ensure_minio_bucket_exists()

CORS(app, 
     origins=["http://localhost:3000"], 
     supports_credentials=True, expose_headers=['Content-Type'])


app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default')  # загружаем secret_key из .env
app.config['SESSION_TYPE'] = 'filesystem'  # Используем локальные файлы для хранения сессий
app.config['SESSION_PERMANENT'] = True  # Делаем сессию временной
app.config['SESSION_FILE_DIR'] = '/tmp/flask_session'  # Где хранятся файлы сессий
app.config['SESSION_USE_SIGNER'] = True  # Подписываем сессию для безопасности

Session(app)

db_username = os.getenv('DB_USERNAME')
db_host = os.getenv('DB_HOST')
db_name = os.getenv('DB_NAME')
db_pass = os.getenv('DB_PASS')
app.config['SQLALCHEMY_DATABASE_URI'] = f'postgresql://{db_username}:{db_pass}@{db_host}/{db_name}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
model = joblib.load('./model.pkl')

inflam_loc_model = joblib.load('ml_exported_files/extra_trees_model.joblib')
label_encoder = joblib.load('ml_exported_files/extra_trees_label_encoder.pkl')

# файлы для детекции воспаления
scaler = joblib.load('ml_exported_files/scaler.pkl')
pca = joblib.load('ml_exported_files/pca.pkl')
knn_tsne = joblib.load('ml_exported_files/knn_tsne.pkl')
centroids = np.load('ml_exported_files/centroids_2d.npy')

# модели для определения анемии
svm_model = joblib.load('anemia_data/OAK_diagnosis_anemia_model.pkl')
label_encoder_anemia = joblib.load('anemia_data/OAK_anemia_label_encoder.pkl')

model = joblib.load('anemia_data/Biohim_anemia_model.pkl')
biochem_anemia_label_encoder = joblib.load("anemia_data/Biohim_anemia_label_encoder.pkl")

logging.basicConfig(level=logging.INFO)

# логин (проверка данных введенных пользователем)
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # проверка пользователя и пароля
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password, password):
        session['user_id'] = user.user_id 

        logging.info('login user.user_id: %s', str(user.user_id))
        logging.info("login сессия []: %s", str(session['user_id']))

        if (not user.is_active):
            return jsonify({'message': 'Неактивный пользователь'}), 200

        user_data = {
            'user_id': user.user_id,
            'username': user.username,
            'age': user.age,
            'sex': user.sex,
            'role_id': user.role_id,
            'polis': user.polis,
            'biochem_access_inflam': user.biochem_access_inflam,
            'biochem_access_anemia': user.biochem_access_anemia,
            'surname': user.surname,
            'name': user.name,
            'otchestvo': user.otchestvo,
            'photo_url': user.photo_url
        }
        return jsonify(user_data), 200
    else:
        return jsonify({'message': 'Неверный логин или пароль'}), 401


# логаут пользователя через его сессию
@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Выход выполнен успешно'}), 200


# регистрация нового юзера и добавление его в бд
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    otchestvo = ''

    if User.query.filter_by(username=data['username']).first():
        return jsonify({"message": "Это имя пользователя уже занято!"}), 400
    
    if User.query.filter_by(polis=data['polis']).first():
        return jsonify({"message": "Этот полис уже есть в системе!"}), 400

    hashed_password = generate_password_hash(data['password'])

    if data['otchestvo']:
        otchestvo = data['otchestvo']
    
    new_id = newId(db, User)
    new_user = User(
        user_id=new_id,
        username=data['username'],
        password=hashed_password,
        age=data['age'],
        sex=bool(int(data['sex'])),
        role_id=0, # новых пользователей регаем как пациентов, потом админ может их "повысить" до врача
        polis=data['polis'],
        is_active=True, 
        biochem_access_anemia=False,
        biochem_access_inflam=False,
        surname=data['surname'],
        name=data['name'],
        otchestvo=otchestvo
    )
    db.session.add(new_user)
    db.session.commit()

    session['user_id'] = new_id
    logging.info('reg сессия: %s', session['user_id'])

    return jsonify({"user_id": new_id}), 201
           
         
@app.route('/api/oak_detect', methods=['POST'])
def detect_oak_full():
    input_json = request.json
    patient_id = None
    doc_id = None

    try:
        logging.info("Полный ОАК-чекап сессия []: %s", str(session['user_id']))
    except KeyError:
        logging.info('Запрос на полный ОАК чекап, текущей сессии нет')

    try:
        anemia_input_data = [float(input_json[feature]) for feature in anemia_oak_labels()]
    except KeyError as e:
        return jsonify({'error': f'Пропущено значение для анемии: {e}'}), 400

    anemia_probs = svm_model.predict_proba([anemia_input_data])[0]
    anemia_class_names = label_encoder_anemia.inverse_transform(range(len(anemia_probs)))
    anemia_result = {
        name: round(float(prob) * 100, 2)
        for name, prob in zip(anemia_class_names, anemia_probs)
    }
    anemia_sorted = sorted(anemia_result.items(), key=lambda x: x[1], reverse=True)
    print("Анемия:", anemia_sorted)

    try:
        inflam_input_data = [float(input_json[feature]) for feature in inflam_labels()]
    except KeyError as e:
        return jsonify({'error': f'Пропущено значение для воспаления: {e}'}), 400

    x_scaled = scaler.transform([inflam_input_data])
    x_pca = pca.transform(x_scaled)
    x_2d = knn_tsne.predict(x_pca)

    inflam_dists = {str(i): float(np.linalg.norm(x_2d[0] - centroid)) for i, centroid in enumerate(centroids)}
    print("Воспаление:", inflam_dists)

    # ----------------- Запись в БД -----------------
    try:
        if session['user_id']:
            user_id = session['user_id']
            user = User.query.filter_by(user_id=user_id).first()

            if user.role_id == 1:
                doc_id = user.user_id
                patient_id = request.args.get('patient_id')
            elif user.role_id == 0:
                patient_id = user.user_id
                doc_id = None
            else:
                return jsonify({"message": "Недопустимая роль для проведения чекапа"}), 403

            patient = User.query.filter_by(user_id=patient_id).first()

            new_oak_checkup = OAK_Checkup(
                checkup_id=newId(db, OAK_Checkup),
                checkup_date=(datetime.now(pytz.timezone('Europe/Moscow')) + timedelta(hours=3)).replace(microsecond=0),
                patient_id=patient_id,
                doc_id=doc_id,
                rbc=anemia_input_data[0],
                hgb=anemia_input_data[1],
                mcv=anemia_input_data[2],
                mch=anemia_input_data[3],
                mchc=anemia_input_data[4],
                leukocytes=inflam_input_data[0],
                eosinophils_prcnt=inflam_input_data[1],
                monocytes_prcnt=inflam_input_data[2],
                lymphocytes_prcnt=inflam_input_data[3],
                neutrophils_prcnt=inflam_input_data[4],
                esr=inflam_input_data[5],
                is_anemia_oak_diagnosis=anemia_sorted,
                is_inflam_clust_dist=inflam_dists['0'],
                no_inflam_clust_dist=inflam_dists['1']
            )
            db.session.add(new_oak_checkup)

            if anemia_result.get('Здоров', 100.0) < 100.0:
                patient.biochem_access_anemia = True
                logging.info(f'Пациенту {patient.username} открыт доступ к биохимии по анемии')
            if inflam_dists['0'] < inflam_dists['1']:
                patient.biochem_access_inflam = True
                logging.info(f'Пациенту {patient.username} открыт доступ к биохимии по воспалению')

            db.session.commit()
            print("Создана объединённая запись по ОАК")
    except KeyError:
        logging.info('Результаты по ОАК получены, но пользователь не авторизован.')

    return jsonify({
        'anemia_result': anemia_sorted,
        'inflam_result': inflam_dists
    })


@app.route('/api/biochem_detect', methods=['POST'])
def biochem_checkup():
    input_json = request.json
    patient_id = None
    doc_id = None
    inflam_result = None
    anemia_result = None

    try:
        logging.info("checkup сессия []: %s", str(session['user_id']))
    except KeyError:
        logging.info('запрос на чекап, текущей сессии нет')

    try:
        if session.get('user_id'):
            user_id = session['user_id']
            user = User.query.filter_by(user_id=user_id).first()

            if user.role_id == 1:
                doc_id = user.user_id
                patient_id = request.args.get('patient_id')
            elif user.role_id == 0:
                patient_id = user.user_id
                doc_id = None

            patient = User.query.filter_by(user_id=patient_id).first()
            sex = 1 if patient and patient.sex else 0
        else:
            sex = 0 
    except:
        logging.info("не удалось получить пол пациента; используется значение по умолчанию (мужской)")
        sex = 0

    biochem_fields = {}

    if all(label in input_json for label in inflam_loc_labels()):
        try:
            inflam_input = [float(input_json[label]) for label in inflam_loc_labels()]
            inflam_prob = inflam_loc_model.predict_proba([inflam_input])[0]
            inflam_classes = label_encoder.inverse_transform(inflam_loc_model.classes_)
            inflam_result = {
                name: round(float(prob) * 100, 2)
                for name, prob in zip(inflam_classes, inflam_prob)
            }
            inflam_result = sorted(inflam_result.items(), key=lambda x: x[1], reverse=True)

            biochem_fields.update({
                'alt': inflam_input[0],
                'ast': inflam_input[1],
                'alp': inflam_input[2],
                'bilirubin': inflam_input[3],
                'creatinine': inflam_input[4],
                'urea': inflam_input[5],
                'amylase': inflam_input[6],
                'lipase': inflam_input[7],
                'ldh': inflam_input[8],
                'inflam_results': inflam_result
            })
        except Exception as e:
            logging.warning(f"Ошибка при обработке воспаления: {e}")

    if all(label in input_json for label in anemia_biochem_labels()):
        try:
            anemia_input = [float(input_json[label]) for label in anemia_biochem_labels()]
            anemia_input.insert(5, sex)

            anemia_prob = model.predict_proba([anemia_input])[0]
            anemia_classes = model.named_steps['model'].classes_
            anemia_class_names = biochem_anemia_label_encoder.inverse_transform(anemia_classes)
            anemia_result = {
                name: round(float(prob) * 100, 2)
                for name, prob in zip(anemia_class_names, anemia_prob)}
            
            anemia_result = sorted(anemia_result.items(), key=lambda x: x[1], reverse=True)

            biochem_fields.update({
                'rbc': anemia_input[0],
                'hgb': anemia_input[1],
                'mcv': anemia_input[2],
                'mch': anemia_input[3],
                'mchc': anemia_input[4],
                'hct': anemia_input[6],
                'rdw': anemia_input[7],
                'sd': anemia_input[8],
                'sdtsd': anemia_input[9],
                'tsd': anemia_input[10],
                'ferritte': anemia_input[11],
                'folate': anemia_input[12],
                'b12': anemia_input[13],
                'is_anemia_biochem_diagnosis': anemia_result
            })
        except Exception as e:
            logging.warning(f"Ошибка при обработке анемии: {e}")

    if biochem_fields and patient_id:
        try:
            new_biochem = Biochem(
                biochem_id=newId(db, Biochem),
                biochem_date=(datetime.now(pytz.timezone('Europe/Moscow')) + timedelta(hours=3)).replace(microsecond=0),
                patient_id=patient_id,
                doc_id=doc_id,
                **biochem_fields
            )
            db.session.add(new_biochem)
            db.session.commit()
            print("Новая запись в БД сохранена")
        except Exception as e:
            logging.error(f"Ошибка при сохранении в БД: {e}")

    return jsonify({
        "inflam_result": inflam_result,
        "anemia_result": anemia_result
    })


@app.route('/api/checkup', methods=['POST'])
def checkup():
    patient_id = None
    doc_id = None
    warning = None
    data = request.json

    try:
        logging.info("checkup сессия []: %s", str(session['user_id']))
    except KeyError:
        logging.info('запрос на чекап, текущей сессии нет')
    
    input_data = [
        int(data['sex']), 
        int(data['age']), 
        float(data['CRP']), 
        float(data['ESR']),
        float(data['WBC']), 
        float(data['Monocytes']), 
        float(data['Lymphocytes']),
        float(data['Basophils']), 
        float(data['Eosinophils'])
    ]
    print('входные данные: ', input_data)
    result = model.predict_proba([input_data])
    class_names = model.classes_
    sorted_result = sorted(
        {class_name: prob for class_name, prob in zip(class_names, result[0])}.items(),
        key=lambda x: x[1], reverse=True
    )

    if request.args.get('patient_id'):
        patient_id = request.args.get('patient_id')

    try:
        if session['user_id']:
            user_id = session['user_id']
            user = User.query.filter_by(user_id=user_id).first()

            if user.role_id == 1:
                doc_id = user.user_id
                patient_id = request.args.get('patient_id')
            elif user.role_id == 0:
                patient_id = user.user_id
                doc_id = None
            else:
                return jsonify({"message": "недопустимая роль для проведения чекапа"}), 403
            
            new_checkup = Checkup(
                checkup_id=newId(db, Checkup),
                patient_id=patient_id,
                age=input_data[1],
                crp=input_data[2],
                esr=input_data[3],
                wbc=input_data[4],
                mono=input_data[5],
                lymph=input_data[6],
                baso=input_data[7],
                eosi=input_data[8],
                checkup_datetime = datetime.now(pytz.timezone('Europe/Moscow')),
                doc_id = doc_id
            )
            db.session.add(new_checkup)
            db.session.commit()
            print("новая запись в бд")
    except KeyError:
        logging.info('резы анализов есть, но они для неавторизованного юзера. на странице будет предупреждения об этом')

    return jsonify({"prediction": sorted_result})

    
# список всех пациентов (только для врачей)
@app.route('/api/patients', methods=['GET'])
def get_patients():
    if session['user_id']:
        user_id = session['user_id']
        user = User.query.filter_by(user_id=user_id).first()
        if user and user.role_id == 1:
            patients = User.query.filter_by(role_id=0).all()
            patients_list = [{'user_id': patient.user_id, 'username': patient.username, 'polis': patient.polis} for patient in patients]
            return jsonify(patients_list), 200
        else:
            return jsonify({'message': 'Доступ запрещен'}), 403
    else:
        return jsonify({'message': 'doc_id не передан'}), 403


# получение профиля конкретного пациента (только для врачей)
@app.route('/api/patient', methods=['GET'])
def get_patient_profile():
    if session['user_id']:
        if request.args.get('patient_id'):
            doc_id = session['user_id']
            patient_id = request.args.get('patient_id')
            doc = User.query.filter_by(user_id=doc_id).first()

            if doc and doc.role_id == 1:
                if User.query.filter_by(user_id=patient_id).first():
                    patient = User.query.filter_by(user_id=patient_id).first()
                    
                    patient_data = {
                        'user_id': patient.user_id,
                        'age': patient.age,
                        'sex': patient.sex,
                        'polis': patient.polis
                    }
                    return jsonify(patient_data), 200
                else:
                    return jsonify({'message': 'Пациент не найден'}), 404
            else:
                return jsonify({'message': 'доступ запрещен'}), 403
        else:
            return jsonify({'message': 'patient_id не передан'}), 403
    else:
        return jsonify({'message': 'вы не авторизованы'}), 403


'''
    сейчас любой врач может посмотреть историю анализов всех пациентов которые вводились врачом
    
    стоит ли сделать так чтобы врач мог смотреть истории только тех пациентов,
    за которыми он закреплен?
'''


@app.route('/api/new_history', methods=['GET'])
def get_patient_history_new():
    if session['user_id']:
        user = User.query.filter_by(user_id=session['user_id']).first()

        serialized_oak_user_checkups = []
        serialized_oak_doc_checkups = []
        serialized_bio_user_checkups = []
        serialized_bio_doc_checkups = []
        
        # Создаем словарь для кэширования имен пользователей
        user_cache = {}

        def get_username(user_id):
            if user_id not in user_cache:
                user = User.query.get(user_id)
                user_cache[user_id] = user.username if user else f"Unknown ({user_id})"
            return user_cache[user_id]

        if user.role_id == 0:
            # чекапы ОАК которые пациент проводил сам => у них doc_id = null
            oak_user_checkups = OAK_Checkup.query.filter_by(doc_id=None).filter_by(patient_id=user.user_id).all()

            # чекапы ОАК которые пациенту вводил доктор => у них doc_id != null
            oak_doc_checkups = OAK_Checkup.query.filter(OAK_Checkup.doc_id.isnot(None)).filter_by(patient_id=user.user_id).all() 
            
            # чекапы БИО которые пациент проводил сам => у них doc_id = null
            bio_user_checkups = Biochem.query.filter_by(doc_id=None).filter_by(patient_id=user.user_id).all()

            # чекапы БИО которые пациенту вводил доктор => у них doc_id != null
            bio_doc_checkups = Biochem.query.filter(Biochem.doc_id.isnot(None)).filter_by(patient_id=user.user_id).all()      
            
        elif user.role_id == 1:
            if request.args.get('patient_id'):
                patient_id = request.args.get('patient_id')
                # чекапы конкретного пациента, которые он вводил сам
                oak_user_checkups = OAK_Checkup.query.filter_by(doc_id=None).filter_by(patient_id=patient_id).all()

                # чекапы конкретного пациента, которые ему вводили доктора
                oak_doc_checkups = OAK_Checkup.query.filter(OAK_Checkup.doc_id.isnot(None)).filter_by(patient_id=patient_id).all()

                # чекапы конкретного пациента, которые он вводил сам
                bio_user_checkups = Biochem.query.filter_by(doc_id=None).filter_by(patient_id=patient_id).all()

                # чекапы конкретного пациента, которые ему вводили доктора
                bio_doc_checkups = Biochem.query.filter(Biochem.doc_id.isnot(None)).filter_by(patient_id=patient_id).all()
            else:
                # чекапы всех пациентов которые вводились доктором
                oak_doc_checkups = OAK_Checkup.query.filter(OAK_Checkup.doc_id.isnot(None)).all()
                
                # чекапы всех пациентов которые вводились самостоятельно
                oak_user_checkups = OAK_Checkup.query.filter_by(doc_id=None).all()

                # чекапы всех пациентов которые вводились доктором
                bio_doc_checkups = Biochem.query.filter(Biochem.doc_id.isnot(None)).all()
                
                # чекапы всех пациентов которые вводились самостоятельно
                bio_user_checkups = Biochem.query.filter_by(doc_id=None).all()
        
        serialized_oak_user_checkups = [{
            **checkup.to_dict(),
            'patient_username': get_username(checkup.patient_id),
            'doc_username': get_username(checkup.doc_id) if checkup.doc_id else None
        } for checkup in oak_user_checkups]
        
        serialized_oak_doc_checkups = [{
            **checkup.to_dict(),
            'patient_username': get_username(checkup.patient_id),
            'doc_username': get_username(checkup.doc_id) if checkup.doc_id else None
        } for checkup in oak_doc_checkups]
        
        serialized_bio_user_checkups = [{
            **checkup.to_dict(),
            'patient_username': get_username(checkup.patient_id),
            'doc_username': get_username(checkup.doc_id) if checkup.doc_id else None
        } for checkup in bio_user_checkups]
        
        serialized_bio_doc_checkups = [{
            **checkup.to_dict(),
            'patient_username': get_username(checkup.patient_id),
            'doc_username': get_username(checkup.doc_id) if checkup.doc_id else None
        } for checkup in bio_doc_checkups]

        return jsonify({
            "oak_user_checkups": serialized_oak_user_checkups,
            "oak_doc_checkups": serialized_oak_doc_checkups,
            "bio_user_checkups": serialized_bio_user_checkups,
            "bio_doc_checkups": serialized_bio_doc_checkups
        }), 200
    
    else:
        return jsonify({'message': 'доступ запрещен'}), 403


@app.route('/api/users', methods=['GET'])
def get_all_users():
    if 'user_id' in session:
        admin = User.query.filter_by(user_id=session['user_id']).first()
        if admin and admin.role_id == 2:
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 50, type=int)
            search_query = request.args.get('search', '', type=str).strip()

            query = User.query

            if search_query:
                search_pattern = f"%{search_query}%"
                query = query.filter(
                    or_(
                        User.username.ilike(search_pattern),
                        User.surname.ilike(search_pattern),
                        User.name.ilike(search_pattern),
                        User.otchestvo.ilike(search_pattern)
                    )
                )


            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            users = pagination.items

            users_data = [{
                'user_id': user.user_id,
                'username': user.username,
                'age': user.age,
                'sex': user.sex,
                'role_id': user.role_id,
                'polis': user.polis,
                'is_active': user.is_active,
                'fio': user.surname + ' ' + user.name + (f' {user.otchestvo}' if user.otchestvo else '')
            } for user in users]

            return jsonify({
                'users': users_data,
                'total': pagination.total,
                'pages': pagination.pages,  
                'page': page,
                'per_page': per_page
            }), 200

    return jsonify({'message': 'Доступ запрещен'}), 403


# количество пользователей с разными ролями
@app.route('/api/users_count', methods=['GET'])
def get_users_count():
    if 'user_id' in session:
        admin = User.query.filter_by(user_id=session['user_id']).first()
        if admin and admin.role_id == 2:
            '''
                select role_id, role, count(*) as cnt
                from users
                left join roles using(role_id)
                group by role_id, role
            '''
            result = User.query.join(Role, User.role_id == Role.role_id, isouter=True) \
            .with_entities(User.role_id, Role.role, func.count().label("cnt")) \
            .group_by(User.role_id, Role.role) \
            .all()

            if result:
                # кастуем result к листу потому что тип Row который возвращает sqlalchemy не жсонится
                result_list = [{"role_id": row.role_id, "role": row.role, "cnt": row.cnt} for row in result]
                return jsonify({'result': result_list}), 200
            else:
                return jsonify({'message': 'result is empty'}), 200
            
        return jsonify({'message': 'forbidden'}), 403
    
    return jsonify({'message': 'unauthorized request'}), 404


# изменение роли пользователя админом 
@app.route('/api/change_role', methods=['POST'])
def change_role():
    if 'user_id' in session:
        admin = User.query.filter_by(user_id=session['user_id']).first()
        if admin and admin.role_id == 2:
            data = request.get_json()
            target_user_id = data.get('user_id')
            
            target_user = User.query.filter_by(user_id=target_user_id).first()
            if target_user:
                
                if target_user.role_id == 0:
                    target_user.role_id = 1
                    
                    target_user.biochem_access_inflam = True
                    target_user.biochem_access_anemia = True
                elif target_user.role_id == 1:
                    target_user.role_id = 0

                    target_user.biochem_access_inflam = False
                    target_user.biochem_access_anemia = False
                else:
                    return jsonify({'message': 'Нельзя изменять роль администратора'}), 400

                db.session.commit()
                return jsonify({'message': 'Роль изменена успешно'}), 200
            else:
                return jsonify({'message': 'Пользователь не найден'}), 404
    return jsonify({'message': 'Доступ запрещен'}), 403


# смена статуса активности пользователя (логическое удаление / восстановление)
@app.route('/api/delete_user', methods=['POST'])
def delete_user():
    if 'user_id' in session:
        admin = User.query.filter_by(user_id=session['user_id']).first()
        if admin and admin.role_id == 2:
            data = request.get_json()
            target_user_id = data.get('user_id')
            
            target_user = User.query.filter_by(user_id=target_user_id).first()
            if target_user:
    
                if target_user.is_active:
                    target_user.is_active = False
                else:
                    target_user.is_active = True

                db.session.commit()
                return jsonify({'message': f'Статус пользователя {target_user} изменен на {target_user.is_active}'}), 200
            else:
                return jsonify({'message': 'Пользователь не найден'}), 404
    return jsonify({'message': 'Доступ запрещен'}), 403


@app.route('/api/change_user_data', methods=['POST'])
def change_user_data():
    data = request.json
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({"message": "user_id обязателен"}), 400

    user = User.query.filter_by(user_id=user_id).first()
    if not user:
        return jsonify({"message": "Пользователь не найден"}), 404

    editable_fields = ['username', 'surname', 'name', 'otchestvo', 'age', 'sex', 'polis']
    changed = False

    for field in editable_fields:
        if field in data:
            value = data[field]
            if field == 'sex':
                value = True if str(value) == '1' else False
            setattr(user, field, value)
            changed = True

    if changed:
        db.session.commit()
        return jsonify({"message": "Данные успешно обновлены"}), 200
    else:
        return jsonify({"message": "Нет изменённых данных"}), 400

@app.route('/api/upload_photo', methods=['POST'])
def upload_photo():
    if 'user_id' not in session:
        return jsonify({'error': 'Необходима авторизация'}), 401
    
    if 'photo' not in request.files:
        return jsonify({'error': 'Фото не предоставлено'}), 400
    
    photo = request.files['photo']
    if photo.filename == '':
        return jsonify({'error': 'Файл не выбран'}), 400
    
    # Проверка типа файла
    if not photo.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
        return jsonify({'error': 'Допустимы только файлы JPG, JPEG или PNG'}), 400
    
    user_id = session['user_id']
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    try:
        # Генерируем уникальное имя файла
        file_extension = photo.filename.split('.')[-1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        object_name = f"users/{user_id}/{unique_filename}"
        
        # Загружаем файл в MinIO
        photo.seek(0)
        minio_client.put_object(
            MINIO_BUCKET_NAME,
            object_name,
            photo,
            length=-1,
            part_size=10*1024*1024,
            content_type=photo.content_type
        )
        
        # Удаляем старое фото, если оно есть
        if user.photo_url:
            try:
                old_object_name = user.photo_url.split('/')[-1]
                minio_client.remove_object(MINIO_BUCKET_NAME, f"users/{user_id}/{old_object_name}")
            except S3Error as e:
                logging.error(f"Ошибка при удалении старого фото: {e}")
        
        # Обновляем URL фото в базе данных
        photo_url = f"/api/user_photo/{user_id}/{unique_filename}"
        user.photo_url = photo_url
        db.session.commit()
        
        return jsonify({'photo_url': photo_url}), 200
    
    except S3Error as e:
        logging.error(f"Ошибка при загрузке фото в MinIO: {e}")
        return jsonify({'error': 'Ошибка при загрузке фото'}), 500

@app.route('/api/user_photo/<int:user_id>/<filename>', methods=['GET'])
def get_user_photo(user_id, filename):
    try:
        object_name = f"users/{user_id}/{filename}"
        response = minio_client.get_object(MINIO_BUCKET_NAME, object_name)
        return response.data, 200, {'Content-Type': response.headers['content-type']}
    except S3Error as e:
        logging.error(f"Ошибка при получении фото из MinIO: {e}")
        return jsonify({'error': 'Фото не найдено'}), 404
    finally:
        response.close()
        response.release_conn()

@app.route('/api/delete_photo', methods=['DELETE'])
def delete_photo():
    if 'user_id' not in session:
        return jsonify({'error': 'Необходима авторизация'}), 401
    
    user_id = session['user_id']
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    if not user.photo_url:
        return jsonify({'error': 'Фото не найдено'}), 404
    
    try:
        filename = user.photo_url.split('/')[-1]
        object_name = f"users/{user_id}/{filename}"
        minio_client.remove_object(MINIO_BUCKET_NAME, object_name)
        
        user.photo_url = None
        db.session.commit()
        
        return jsonify({'message': 'Фото успешно удалено'}), 200
    except S3Error as e:
        logging.error(f"Ошибка при удалении фото из MinIO: {e}")
        return jsonify({'error': 'Ошибка при удалении фото'}), 500

if __name__ == '__main__':
    app.run(debug=True)