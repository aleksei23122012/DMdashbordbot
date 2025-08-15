import pandas as pd
import gspread
import os
import json

# --- [ НАСТРОЙКИ СКРИПТА ] ---
# ВАЖНО: Вставьте сюда ID вашей главной таблицы
 
# ID вашей ЕДИНОЙ таблицы (где "Дашборд", "crm" и "lidscrm")
DASHBOARD_SHEET_ID = '1s_m6Sssjld0BFwhGDVXEC4YRWeH3dYgzNpgiTMwdgSk'
 
# Название листа, где лежит список CRM-ссылок
SETTINGS_WORKSHEET_NAME = 'crm' 
 
# Название листа, КУДА выгружать собранные данные
TARGET_WORKSHEET_NAME = 'lidscrm'
 
# --- Названия листов и колонок в ИСХОДНЫХ CRM-таблицах ---
TODAY_SHEET_NAME = 'Стат по ТМ-БРО (сегодня)'
MONTH_SHEET_NAME = 'Стат по ТМ-БРО (месяц)'
# Буквы больше не используются, но оставим для справки
# OPERATOR_COLUMN_LETTER = 'O'
# LEADS_COLUMN_LETTER = 'R'

# НОВЫЕ НАСТРОЙКИ: Точные названия заголовков, которые ищем
OPERATOR_COLUMN_NAME = 'для рейтинга' # <-- Убедитесь, что это точный заголовок колонки O
LEADS_COLUMN_NAME_TODAY = 'Лидов' # <-- Убедитесь, что это точный заголовок колонки R на листе "сегодня"
LEADS_COLUMN_NAME_MONTH = 'Лидов' # <-- Убедитесь, что это точный заголовок колонки R на листе "месяц"
# --- КОНЕЦ НАСТРОЕК ---

def get_data_from_worksheet(worksheet, operator_col_name, leads_col_name):
    """Более надежная функция для чтения данных с листа."""
    all_values = worksheet.get_all_values()
    if not all_values:
        return pd.DataFrame(columns=['Оператор', 'Лиды'])
        
    headers = all_values[0]
    try:
        operator_idx = headers.index(operator_col_name)
    except ValueError:
        # Если не нашли колонку "для рейтинга", ищем "Оператор"
        try:
            operator_idx = headers.index('Оператор')
        except ValueError:
            raise ValueError(f"Не удалось найти колонку оператора ('{operator_col_name}' или 'Оператор')")

    try:
        leads_idx = headers.index(leads_col_name)
    except ValueError:
        raise ValueError(f"Не удалось найти колонку лидов ('{leads_col_name}')")

    data = []
    for row in all_values[1:]: # Пропускаем заголовки
        # Убеждаемся, что в строке достаточно колонок
        if len(row) > max(operator_idx, leads_idx):
            operator = row[operator_idx]
            leads = row[leads_idx]
            if operator: # Добавляем только если есть имя оператора
                data.append({'Оператор': operator, 'Лиды': leads})
                
    return pd.DataFrame(data)


def run_etl():
    print("🚀 Запуск процесса сбора данных по операторам...")
     
    # Аутентификация
    try:
        sa_key_string = os.environ.get('GCP_SA_KEY')
        sa_key_json = json.loads(sa_key_string)
        gc = gspread.service_account_from_dict(sa_key_json)
        print("✅ Аутентификация успешна.")
    except Exception as e:
        raise SystemExit(f"🔥🔥 ОШИБКА АУТЕНТИФИКАЦИИ: {e}")

    # Получение списка источников
    try:
        dashboard_spreadsheet = gc.open_by_key(DASHBOARD_SHEET_ID)
        settings_sheet = dashboard_spreadsheet.worksheet(SETTINGS_WORKSHEET_NAME)
        sources_df = pd.DataFrame(settings_sheet.get_all_records())
        print(f"✅ Найдено {len(sources_df)} источников в таблице '{SETTINGS_WORKSHEET_NAME}'.")
    except Exception as e:
        raise SystemExit(f"🔥🔥 ОШИБКА чтения настроек: {e}")

    # Сбор данных из всех источников
    all_teams_dataframes = []
    for index, row in sources_df.iterrows():
        team_name = row.get('Название команды')
        sheet_id = row.get('ID текущей таблицы')

        if not all([team_name, sheet_id]): 
            print(f"  - Пропущена строка {index+2} в настройках (нет имени или ID).")
            continue
         
        print(f"\n--- Обработка команды: {team_name} ---")
        try:
            source_spreadsheet = gc.open_by_key(sheet_id)
             
            # 1. Получаем данные за СЕГОДНЯ
            try:
                today_ws = source_spreadsheet.worksheet(TODAY_SHEET_NAME)
                df_today = get_data_from_worksheet(today_ws, OPERATOR_COLUMN_NAME, LEADS_COLUMN_NAME_TODAY)
                df_today = df_today.rename(columns={'Лиды': 'Лидов сегодня'})
                print(f"  ✅ Данные 'сегодня' загружены ({len(df_today)} строк).")
            except gspread.exceptions.WorksheetNotFound:
                print(f"  ⚠️ Лист '{TODAY_SHEET_NAME}' не найден. Данные за сегодня будут 0.")
                df_today = pd.DataFrame(columns=['Оператор', 'Лидов сегодня'])

            # 2. Получаем данные за МЕСЯЦ
            try:
                month_ws = source_spreadsheet.worksheet(MONTH_SHEET_NAME)
                df_month = get_data_from_worksheet(month_ws, OPERATOR_COLUMN_NAME, LEADS_COLUMN_NAME_MONTH)
                df_month = df_month.rename(columns={'Лиды': 'Лидов месяц'})
                print(f"  ✅ Данные 'месяц' загружены ({len(df_month)} строк).")
            except gspread.exceptions.WorksheetNotFound:
                print(f"  ⚠️ Лист '{MONTH_SHEET_NAME}' не найден. Данные за месяц будут 0.")
                df_month = pd.DataFrame(columns=['Оператор', 'Лидов месяц'])
                 
            # 3. Объединяем данные по операторам
            if df_today.empty and df_month.empty:
                print("  ❌ В обеих вкладках нет данных, пропускаем команду.")
                continue
             
            merged_df = pd.merge(df_today, df_month, on='Оператор', how='outer')
            merged_df['Команда'] = team_name
            all_teams_dataframes.append(merged_df)
             
        except Exception as e:
            print(f"    -> 🔥 ОБЩАЯ ОШИБКА для '{team_name}': {e}")
     
    if not all_teams_dataframes:
        print("⚠️ Не удалось собрать данные ни из одной команды. Завершение.")
        return

    # Финальная сборка и очистка
    final_df = pd.concat(all_teams_dataframes, ignore_index=True)
    final_df.fillna(0, inplace=True)
    final_df = final_df[['Команда', 'Оператор', 'Лидов сегодня', 'Лидов месяц']]
    final_df = final_df[final_df['Оператор'].astype(str).str.strip() != '']
     
    print(f"\n✅ Итого собрано {len(final_df)} уникальных строк по операторам.")
     
    # Выгрузка результата
    try:
        target_worksheet = dashboard_spreadsheet.worksheet(TARGET_WORKSHEET_NAME)
        target_worksheet.clear()
        data_to_upload = [final_df.columns.values.tolist()] + final_df.values.tolist()
        target_worksheet.update(data_to_upload, value_input_option='USER_ENTERED')
        target_worksheet.format('A1:Z1', {'textFormat': {'bold': True}})
        print(f"🎉 УСПЕХ! Данные выгружены на лист '{TARGET_WORKSHEET_NAME}'.")
    except Exception as e:
        raise SystemExit(f"🔥🔥 ОШИБКА выгрузки данных: {e}")

if __name__ == "__main__":
    run_etl()
