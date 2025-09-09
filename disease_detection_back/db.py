from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import TIMESTAMP
from decimal import Decimal
from sqlalchemy.dialects.postgresql import JSONB

# Инициализация SQLAlchemy
db = SQLAlchemy()


# Таблица пользователей
class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.role_id'), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    sex = db.Column(db.Boolean, nullable=False)
    polis = db.Column(db.BigInteger, nullable=False, unique=True)
    is_active = db.Column(db.Boolean, nullable=False)
    biochem_access_anemia = db.Column(db.Boolean, nullable=True)
    biochem_access_inflam = db.Column(db.Boolean, nullable=True)

    surname = db.Column(db.String(100), unique=False, nullable=False)
    name = db.Column(db.String(100), unique=False, nullable=False)
    otchestvo = db.Column(db.String(100), unique=False, nullable=True)
    photo_url = db.Column(db.String(500), nullable=True)

    # Связь с таблицей roles
    role = db.relationship('Role', backref='users')


class Role(db.Model):
    __tablename__ = 'roles'
    role_id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(50), nullable=False)


class Checkup(db.Model):
    __tablename__ = 'checkups'
    checkup_id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    
    age = db.Column(db.Integer, nullable=False)
    crp = db.Column(db.Numeric(precision=6, scale=2), nullable=True) # 6 цифр из которых 2 последние после запятой
    esr = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    wbc = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    mono = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    lymph = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    baso = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    eosi = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    checkup_datetime = db.Column(db.TIMESTAMP(timezone=False), nullable=False)
    doc_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=True)

    # Связь с таблицей users
    user = db.relationship(
        'User',
        backref='checkups',
        foreign_keys=[patient_id]  # Явно указываем, какое поле является внешним ключом
    )
    doctor = db.relationship(
        'User',
        backref='checkups_as_doctor',
        foreign_keys=[doc_id]  # Второе отношение для doc_id
    )


class OAK_Checkup(db.Model):
    __tablename__ = 'oak_checkups'

    checkup_id = db.Column(db.Integer, primary_key=True)
    checkup_date = db.Column(TIMESTAMP(timezone=False, precision=0), nullable=False) # precision=0 - точность до секунд без наносекунд
    patient_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    doc_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=True)

    age = db.Column(db.SmallInteger, nullable=False)
    leukocytes = db.Column(db.Numeric(precision=6, scale=2), nullable=True) # 6 цифр из которых 2 последние после запятой
    eosinophils_prcnt = db.Column(db.Numeric(precision=6, scale=2), nullable=True) 
    monocytes_prcnt = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    lymphocytes_prcnt = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    neutrophils_prcnt = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    esr = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    is_inflam_clust_dist = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    no_inflam_clust_dist = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    
    hgb = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    mcv = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    mch = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    mchc = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    rbc = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    is_anemia_oak_diagnosis = db.Column(JSONB, nullable=False)
   
    # Связь с таблицей users
    user = db.relationship(
        'User',
        backref='oak_checkups',
        foreign_keys=[patient_id]  
    )
    doctor = db.relationship(
        'User',
        backref='oak_checkups_as_doctor',
        foreign_keys=[doc_id]  
    )

    def to_dict(self):
        def serialize(value):
            if isinstance(value, Decimal):
                return float(value)
            if hasattr(value, 'isoformat'):
                return value.isoformat()
            return value

        return {
            'checkup_id': self.checkup_id,
            'checkup_date': serialize(self.checkup_date),
            'patient_id': self.patient_id,
            'doc_id': self.doc_id,
            'age': self.age,
            'leukocytes': serialize(self.leukocytes),
            'eosinophils_prcnt': serialize(self.eosinophils_prcnt),
            'monocytes_prcnt': serialize(self.monocytes_prcnt),
            'lymphocytes_prcnt': serialize(self.lymphocytes_prcnt),
            'neutrophils_prcnt': serialize(self.neutrophils_prcnt),
            'esr': serialize(self.esr),
            'is_inflam_clust_dist': serialize(self.is_inflam_clust_dist),
            'no_inflam_clust_dist': serialize(self.no_inflam_clust_dist),
            'hgb': serialize(self.hgb),
            'mcv': serialize(self.mcv),
            'mch': serialize(self.mch),
            'mchc': serialize(self.mchc),
            'rbc': serialize(self.rbc),
            'is_anemia_oak_diagnosis': self.is_anemia_oak_diagnosis,
        }
    

class Biochem(db.Model):
    __tablename__ = 'biochem'

    biochem_id = db.Column(db.Integer, primary_key=True)
    biochem_date = db.Column(TIMESTAMP(timezone=False, precision=0), nullable=False) # precision=0 - точность до секунд без наносекунд
    patient_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    doc_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=True)

    alt = db.Column(db.SmallInteger, nullable=True)
    ast = db.Column(db.Numeric(precision=6, scale=2), nullable=True) # 6 цифр из которых 2 последние после запятой
    alp = db.Column(db.Numeric(precision=6, scale=2), nullable=True) 
    bilirubin = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    creatinine = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    urea = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    amylase = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    lipase = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    ldh = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    inflam_results = db.Column(JSONB, nullable=True)

    hgb = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    mcv = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    mch = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    mchc = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    rbc = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    hct = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    rdw = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    sd = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    tsd = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    sdtsd = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    ferritte = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    folate = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    b12 = db.Column(db.Numeric(precision=6, scale=2), nullable=True)
    is_anemia_biochem_diagnosis = db.Column(JSONB, nullable=True)
        
    # Связь с таблицей users
    user = db.relationship(
        'User',
        backref='biochem',
        foreign_keys=[patient_id]  # Явно указываем, какое поле является внешним ключом
    )
    doctor = db.relationship(
        'User',
        backref='biochem_doc',
        foreign_keys=[doc_id]  # Второе отношение для doc_id
    )

    def to_dict(self):
        def serialize(value):
            if isinstance(value, Decimal):
                return float(value)
            if hasattr(value, 'isoformat'):
                return value.isoformat()
            return value

        return {
            'biochem_id': self.biochem_id,
            'biochem_date': serialize(self.biochem_date),
            'patient_id': self.patient_id,
            'doc_id': self.doc_id,
            'alt': self.alt,
            'ast': serialize(self.ast),
            'alp': serialize(self.alp),
            'bilirubin': serialize(self.bilirubin),
            'creatinine': serialize(self.creatinine),
            'urea': serialize(self.urea),
            'amylase': serialize(self.amylase),
            'lipase': serialize(self.lipase),
            'ldh': serialize(self.ldh),
            'inflam_results': self.inflam_results,
            'hgb': serialize(self.ldh),
            'mcv': serialize(self.ldh),
            'mch': serialize(self.ldh),
            'mchc': serialize(self.ldh),
            'rbc': serialize(self.ldh),
            'hct': serialize(self.ldh),
            'rdw': serialize(self.ldh),
            'sd': serialize(self.ldh),
            'tsd': serialize(self.ldh),
            'sdtsd': serialize(self.ldh),
            'ferritte': serialize(self.ldh),
            'folate': serialize(self.ldh),
            'b12': serialize(self.ldh),
            'is_anemia_biochem_diagnosis': self.is_anemia_biochem_diagnosis,
        }
        