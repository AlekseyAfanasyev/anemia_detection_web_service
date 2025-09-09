import csv
import random

N = 3000 # кол-во записей в датасетах

def clip(x, lo, hi):
    return max(lo, min(x, hi))

def add_noise(x, noise_level=0.1):
    """
    Добавляет гауссовский шум к значению x. 
    Параметр noise_level определяет относительную амплитуду шума.
    """
    return x + random.gauss(0, noise_level * x)

def maybe_add_outlier(x, lo, hi, outlier_probability=0.05):
    """
    С вероятностью outlier_probability заменяет значение x на выброс,
    генерируя значение значительно меньше нижней границы или больше верхней.
    """
    if random.random() < outlier_probability:
        if random.random() < 0.5:
            # Генерируем выброс ниже нижней границы
            return lo - abs(random.gauss(0, (x - lo) / 2))
        else:
            # Генерируем выброс выше верхней границы
            return hi + abs(random.gauss(0, (hi - x) / 2))
    return x

with open("inflammation_data/datasets/best/oak.csv", "w", newline="") as csvfile:
    writer = csv.writer(csvfile)
    # Записываем заголовки столбцов
    writer.writerow([
        "Leukocytes", "Basophils (%)", "Eosinophils (%)", 
        "Monocytes (%)", "Lymphocytes (%)", "Neutrophils (%)", 
        "ESR (mm/h)", "Inflammation"
    ])
    
    for i in range(N):
        # Случайный диагноз: 0 - без воспаления, 1 - с воспалением
        diagnosis = random.choice([0, 1])
        
        if diagnosis == 0:
            # Группа без воспаления, но распределения признаков пересекаются с воспаленной группой
            leukocytes  = clip(round(add_noise(random.gauss(7.0, 1.5), 0.15), 2), 3.0, 12.0)
            basophils   = clip(round(add_noise(random.gauss(0.3, 0.1), 0.2), 2), 0.0, 1.0)
            eosinophils = clip(round(add_noise(random.gauss(3.0, 1.0), 0.2), 2), 1.0, 7.0)
            monocytes   = clip(round(add_noise(random.gauss(5.0, 1.0), 0.15), 2), 1.0, 11.0)
            lymphocytes = clip(round(add_noise(random.gauss(30.0, 5.0), 0.1), 2), 15.0, 45.0)
            neutrophils = clip(round(add_noise(random.gauss(55.0, 8.0), 0.15), 2), 35.0, 75.0)
            esr         = clip(round(add_noise(random.gauss(10.0, 3.0), 0.3), 2), 1.0, 25.0)
        else:
            # Группа с воспалением, признаки распределены так, что их значения пересекаются с группой без воспаления
            leukocytes  = clip(round(add_noise(random.gauss(9.0, 2.0), 0.15), 2), 5.0, 16.0)
            basophils   = clip(round(add_noise(random.gauss(0.3, 0.1), 0.2), 2), 0.0, 1.0)
            eosinophils = clip(round(add_noise(random.gauss(2.5, 1.0), 0.2), 2), 0.5, 6.0)
            monocytes   = clip(round(add_noise(random.gauss(7.0, 1.5), 0.15), 2), 3.0, 12.0)
            lymphocytes = clip(round(add_noise(random.gauss(25.0, 5.0), 0.1), 2), 10.0, 40.0)
            neutrophils = clip(round(add_noise(random.gauss(65.0, 7.0), 0.15), 2), 50.0, 85.0)
            esr         = clip(round(add_noise(random.gauss(20.0, 5.0), 0.3), 2), 5.0, 35.0)
        
        # Применяем выбросы к отдельным признакам
        leukocytes = maybe_add_outlier(leukocytes, 3.0 if diagnosis == 0 else 5.0, 12.0 if diagnosis == 0 else 16.0)
        eosinophils = maybe_add_outlier(eosinophils, 1.0 if diagnosis == 0 else 0.5, 7.0 if diagnosis == 0 else 6.0)
        esr = maybe_add_outlier(esr, 1.0 if diagnosis == 0 else 5.0, 25.0 if diagnosis == 0 else 35.0)
        
        writer.writerow([
            leukocytes, basophils, eosinophils, monocytes,
            lymphocytes, neutrophils, esr, diagnosis
        ])



# -------------------------------------------- ДАТАСЕТ С ЛЕЙК Ф, СКОРОСТЬЮ ОСЕД ЭР, БИОХИМИЕЙ --------------------------------------------
# Функции clip, add_noise, maybe_add_outlier предполагается, что уже определены

# Диапазоны для показателей общего анализа крови
normal_blood_ranges = {
    "Leukocytes": (4.0, 11.0),
    "Basophils": (0, 1),         # в %
    "Eosinophils": (1, 6),        # в %
    "Monocytes": (2, 10),         # в %
    "Lymphocytes": (20, 40),      # в %
    "Neutrophils": (40, 70),      # в %
    "ESR": (1, 20)               # мм/ч
}

inflammatory_blood_ranges = {
    "Leukocytes": (11, 20),
    "Basophils": (0, 1),
    "Eosinophils": (0.5, 4),
    "Monocytes": (8, 15),
    "Lymphocytes": (10, 30),
    "Neutrophils": (70, 90),
    "ESR": (30, 120)
}

# Нормальные диапазоны для биохимических показателей
normal_biochem_ranges = {
    "ALT": (7, 56),             # U/L
    "AST": (10, 40),            # U/L
    "ALP": (44, 147),           # U/L
    "Bilirubin": (0.1, 1.2),      # mg/dL
    "Creatinine": (0.6, 1.3),     # mg/dL
    "Urea": (7, 20),            # mg/dL
    "Amylase": (30, 110),       # U/L
    "Lipase": (10, 140),        # U/L
    "LDH": (140, 280)           # U/L
}

# Патологические диапазоны для каждого типа очага воспаления
biochem_abnormal = {
   "Печень": {
       "ALT": (70, 200),
       "AST": (50, 150),
       "ALP": (160, 300),
       "Bilirubin": (1.5, 3.0),
       "Creatinine": normal_biochem_ranges["Creatinine"],
       "Urea": normal_biochem_ranges["Urea"],
       "Amylase": normal_biochem_ranges["Amylase"],
       "Lipase": normal_biochem_ranges["Lipase"],
       "LDH": normal_biochem_ranges["LDH"]
   },
   "Почки": {
       "ALT": normal_biochem_ranges["ALT"],
       "AST": normal_biochem_ranges["AST"],
       "ALP": normal_biochem_ranges["ALP"],
       "Bilirubin": normal_biochem_ranges["Bilirubin"],
       "Creatinine": (1.5, 3.0),
       "Urea": (25, 50),
       "Amylase": normal_biochem_ranges["Amylase"],
       "Lipase": normal_biochem_ranges["Lipase"],
       "LDH": normal_biochem_ranges["LDH"]
   },
   "Поджелудочная железа": {
       "ALT": normal_biochem_ranges["ALT"],
       "AST": normal_biochem_ranges["AST"],
       "ALP": normal_biochem_ranges["ALP"],
       "Bilirubin": normal_biochem_ranges["Bilirubin"],
       "Creatinine": normal_biochem_ranges["Creatinine"],
       "Urea": normal_biochem_ranges["Urea"],
       "Amylase": (150, 400),
       "Lipase": (200, 500),
       "LDH": normal_biochem_ranges["LDH"]
   },
   "Легкие": {
       "ALT": normal_biochem_ranges["ALT"],
       "AST": normal_biochem_ranges["AST"],
       "ALP": normal_biochem_ranges["ALP"],
       "Bilirubin": normal_biochem_ranges["Bilirubin"],
       "Creatinine": normal_biochem_ranges["Creatinine"],
       "Urea": normal_biochem_ranges["Urea"],
       "Amylase": normal_biochem_ranges["Amylase"],
       "Lipase": normal_biochem_ranges["Lipase"],
       "LDH": (300, 500)
   }
}

# Список вариантов очагов воспаления
localizations = list(biochem_abnormal.keys())

# Заголовки для CSV файла
headers = [
    "Leukocytes", "Basophils (%)", "Eosinophils (%)", "Monocytes (%)",
    "Lymphocytes (%)", "Neutrophils (%)", "ESR (mm/h)", 
    "ALT", "AST", "ALP", "Bilirubin", "Creatinine", "Urea", "Amylase", "Lipase", "LDH",
    "Inflammation Localization", "Inflammation"
]

# Новые параметры для рандомизации
noise_level = 0.2         # увеличенный уровень шума
outlier_prob = 0.25       # вероятность выброса
feature_random_prob = 0.3 # вероятность замены рассчитанного значения на случайное из диапазона
label_noise_prob = 0.1  # вероятность переворота метки

with open("inflammation_data/datasets/best/oak_bio.csv", "w", newline="", encoding="utf-8") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(headers)  # Записываем заголовки

    for i in range(N):
        # Определяем диагноз и с вероятностью label_noise_prob переворачиваем его
        diagnosis = random.choice([0, 1])
        if random.random() < label_noise_prob:
            diagnosis = 1 - diagnosis
        
        if diagnosis == 1:
            localization = random.choice(localizations)
        else:
            localization = "unknown"

        # Генерация значений общего анализа крови с усиленной случайностью
        if diagnosis == 0:
            blood_params = {
                "Leukocytes": (7.0, 1.5, (3.0, 12.0)),
                "Basophils": (0.3, 0.1, (0, 1)),
                "Eosinophils": (3.0, 1.0, (1, 7)),
                "Monocytes": (5.0, 1.0, (1, 11)),
                "Lymphocytes": (30.0, 5.0, (15, 45)),
                "Neutrophils": (55.0, 8.0, (35, 75)),
                "ESR": (10.0, 3.0, (1, 25))
            }
        else:
            blood_params = {
                "Leukocytes": (9.0, 2.0, (5.0, 16.0)),
                "Basophils": (0.3, 0.1, (0, 1)),
                "Eosinophils": (2.5, 1.0, (0.5, 6)),
                "Monocytes": (7.0, 1.5, (3, 12)),
                "Lymphocytes": (25.0, 5.0, (10, 40)),
                "Neutrophils": (65.0, 7.0, (50, 85)),
                "ESR": (20.0, 5.0, (5, 35))
            }
        blood_values = {}
        for marker, (mean, std, clip_bounds) in blood_params.items():
            low, high = clip_bounds
            raw_value = random.gauss(mean, std)
            noisy_value = round(add_noise(raw_value, noise_level), 2)
            clipped_value = clip(noisy_value, low, high)
            final_value = maybe_add_outlier(clipped_value, low, high, outlier_prob)
            final_value *= random.uniform(0.95, 1.05)
            # Добавляем дополнительную случайность: с вероятностью feature_random_prob заменяем значение случайным числом из диапазона
            if random.random() < feature_random_prob:
                final_value = round(random.uniform(low, high), 2)
            # Дополнительный независимый сдвиг: до ±10% от диапазона
            extra_shift = random.uniform(-(high - low) * 0.1, (high - low) * 0.1)
            final_value = clip(final_value + extra_shift, low, high)
            blood_values[marker] = final_value

        # Генерация значений биохимии с усиленной случайностью
        biochem_values = {}
        for marker, (low, high) in normal_biochem_ranges.items():
            if diagnosis == 0:
                mean = (low + high) / 2
                std = (high - low) / 6
            else:
                if marker in biochem_abnormal[localization]:
                    if random.random() < 0.5:
                        ab_low, ab_high = biochem_abnormal[localization][marker]
                        mean = (ab_low + ab_high) / 2
                        std = (ab_high - ab_low) / 6
                        mean = (mean + (low + high) / 2) / 2
                    else:
                        mean = (low + high) / 2
                        std = (high - low) / 6
                else:
                    mean = (low + high) / 2
                    std = (high - low) / 6

            raw_value = random.gauss(mean, std)
            noisy_value = round(add_noise(raw_value, noise_level), 2)
            clipped_value = clip(noisy_value, low, high)
            final_value = maybe_add_outlier(clipped_value, low, high, outlier_prob)
            final_value *= random.uniform(0.95, 1.05)
            if random.random() < feature_random_prob:
                final_value = round(random.uniform(low, high), 2)
            extra_shift = random.uniform(-(high - low) * 0.1, (high - low) * 0.1)
            final_value = clip(final_value + extra_shift, low, high)
            biochem_values[marker] = final_value

        writer.writerow([
            blood_values["Leukocytes"], blood_values["Basophils"], blood_values["Eosinophils"],
            blood_values["Monocytes"], blood_values["Lymphocytes"], blood_values["Neutrophils"], blood_values["ESR"],
            biochem_values["ALT"], biochem_values["AST"], biochem_values["ALP"], biochem_values["Bilirubin"],
            biochem_values["Creatinine"], biochem_values["Urea"], biochem_values["Amylase"],
            biochem_values["Lipase"], biochem_values["LDH"],
            localization, diagnosis
        ])




# ----------------------------------------------------- ДАТАСЕТ ТОЛЬКО С БИОХИМИЕЙ -----------------------------------------------------
  
# Параметры шума
noise_level = 0.3         # относительная амплитуда дополнительного шума
outlier_prob = 0.05       # вероятность возникновения выброса
feature_random_prob = 0.2 # вероятность замены рассчитанного значения на случайное из диапазона

# Заголовки для CSV 
headers = [ 
    "ALT", "AST", "ALP", "Bilirubin", "Creatinine", "Urea", "Amylase", "Lipase", "LDH",
    "Inflammation Localization"
]

with open("inflammation_data/datasets/best/bio_only.csv", "w", newline="", encoding="utf-8") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(headers)  # Записываем заголовки

    for i in range(1, N):
        if i <= N // 5:
            # Записи без воспаления (используем нормальные диапазоны биохимии)
            biochem_values = {}
            for marker, (low, high) in normal_biochem_ranges.items():
                mean = (low + high) / 2
                std = (high - low) / 6  # ~99.7% значений попадут в диапазон
                value = random.gauss(mean, std)
                # Добавляем шум и ограничиваем значение
                value = round(add_noise(value, noise_level), 2)
                value = clip(value, low, high)
                value = maybe_add_outlier(value, low, high, outlier_prob)
                # С вероятностью feature_random_prob заменяем на случайное значение из диапазона
                if random.random() < feature_random_prob:
                    value = round(random.uniform(low, high), 2)
                biochem_values[marker] = value
            localization = "unknown"
        else:
            # Записи с воспалением (патологические значения)
            j = i - N // 2
            localization = localizations[j % len(localizations)]
            
            biochem_values = {}
            for marker, (low, high) in normal_biochem_ranges.items():
                if marker in biochem_abnormal[localization]:
                    # Используем патологический диапазон для данного показателя
                    ab_low, ab_high = biochem_abnormal[localization][marker]
                    mean = (ab_low + ab_high) / 2
                    std = (ab_high - ab_low) / 6
                    value = random.gauss(mean, std)
                    value = round(add_noise(value, noise_level), 2)
                    value = clip(value, ab_low, ab_high)
                    value = maybe_add_outlier(value, ab_low, ab_high, outlier_prob)
                else:
                    # Если патологического диапазона нет, остаёмся в рамках нормальных значений
                    mean = (low + high) / 2
                    std = (high - low) / 6
                    value = random.gauss(mean, std)
                    value = round(add_noise(value, noise_level), 2)
                    value = clip(value, low, high)
                    value = maybe_add_outlier(value, low, high, outlier_prob)
                if random.random() < feature_random_prob:
                    value = round(random.uniform(low, high), 2)
                biochem_values[marker] = value

        writer.writerow([
            biochem_values["ALT"], biochem_values["AST"], biochem_values["ALP"], biochem_values["Bilirubin"], 
            biochem_values["Creatinine"], biochem_values["Urea"], biochem_values["Amylase"], biochem_values["Lipase"], 
            biochem_values["LDH"], localization
        ])