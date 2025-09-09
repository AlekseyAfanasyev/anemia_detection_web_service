import pytz
import numpy as np
from sklearn.decomposition import PCA

# мужской = 0 = False
# женский = 1 = True
def sex_to_char(sex: bool) -> str:
    return 'Мужской' if not sex else 'Женский'

def sex_to_bool(sex: str) -> bool:
    return False if sex.toLowercase == 'мужской' else True

# возвращаем новый "следующий" айди для записи в бд
def newId(db, model) -> int:
    return db.session.query(model).count() + 1

def analysis_norms(checkup: dict) -> dict:
    return [
        {'indicator': 'CRP', 
            'value': checkup.crp, 
            'normal_range': '0-10', 
            'verdict': 'В норме' if checkup.crp <= 10 else 'Повышен'},
        {'indicator': 'ESR', 
            'value': checkup.esr, 
            'normal_range': '0-20', 
            'verdict': 'В норме' if checkup.esr <= 20 else 'Повышен'},
        {'indicator': 'WBC', 
            'value': checkup.wbc, 
            'normal_range': '4-10', 
            'verdict': 'В норме' if 4 <= checkup.wbc <= 10 else 'Отклонение'},
        {'indicator': 'Mono', 
            'value': checkup.mono, 
            'normal_range': '0-8',
            'verdict': 'В норме' if checkup.mono <= 8 else 'Повышен'},
        {'indicator': 'Lymph', 
            'value': checkup.lymph, 
            'normal_range': '20-40', 
            'verdict': 'В норме' if 20 <= checkup.lymph <= 40 else 'Отклонение'},
        {'indicator': 'Baso', 
            'value': checkup.baso, 
            'normal_range': '0-1', 
            'verdict': 'В норме' if checkup.baso <= 1 else 'Повышен'},
        {'indicator': 'Eosi', 
            'value': checkup.eosi, 
            'normal_range': '0-5', 
            'verdict': 'В норме' if checkup.eosi <= 5 else 'Повышен'}
    ]

# приводим дату к московской таймзоне
def datetime_to_msc_tz(dt: str) -> str:
    return dt.replace(tzinfo=pytz.utc).astimezone(pytz.timezone('Europe/Moscow')).strftime('%Y-%m-%d %H:%M:%S')

def inflam_labels() -> list:
    return ['Лейкоциты', 'Эозинофилы', 'Моноциты', 
           'Лимфоциты', 'Нейтрофилы', 'Скорость оседания эритроцитов']

def inflam_loc_labels() -> list:
    return ['Аланинаминотрансфераза', 'Аспартатаминотрансфераза', 'Щелочная фосфатаза', 
            'Билирубин', 'Креатинин', 'Мочевина', 'Амилоза', 'Липаза', 'Лактатдегидрогеназа']

def anemia_oak_labels() -> list:
    return ['Эритроциты', 'Гемоглобин', 'Средний объем эритроцита', 
            'Среднее содержание гемоглобина в эритроците', 'Средняя концентрация гемоглобина в эритроците']

def anemia_biochem_labels() -> list:
    return ['Эритроциты', 'Гемоглобин', 'Средний объем эритроцита', 
            'Среднее содержание гемоглобина в эритроците', 'Средняя концентрация гемоглобина в эритроците', 'Гематокрит', 'Ширина распределения эритроцитов по объему', 'Сывороточное железо', 
            'Насыщение трансферрина', 'Общая железосвязывающая способность', 'Ферритин', 'Витамин B9', 'Витамин В12']