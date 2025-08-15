import pandas as pd
import gspread
import os
import json

# --- [ НАСТРОЙКИ СКРИПТА ] ---
# ВАЖНО: Вставьте сюда ваши реальные ID и названия

# 1. ID вашей ЕДИНОЙ таблицы (где и дашборд, и настройки)
DASHBOARD_AND_SETTINGS_SHEET_ID = '1s_m6Sssjld0BFwhGDVXEC4YRWeH3dYgzNpgiTMwdgSk'

# 2. Название листа, где лежит список источников
SETTINGS_WORKSHEET_NAME = 'crm' # <-- ВАЖНО: точное название листа

# 3. Название листа, КУДА выгружать собранные данные
TARGET_WORKSHEET_NAME = 'lidscrm'

# 4. Название листа в ИСХОДНЫХ CRM-таблицах, откуда забирать данные
CRM_WORKSHEET_NAME = 'Лиды' 
# --- КОНЕЦ НАСТРОЕК ---

def run_etl():
    print("🚀 Запуск процесса сбора данных...")
    
    # Аутентификация через сервисный аккаунт
    try:
        sa_key_string = os.environ.get('GCP_SA_KEY')
        sa_key_json = json.loads(sa_key_string)
        gc = gspread.service_account_from_dict(sa_key_json)
        print("✅ Аутентификация через сервисный аккаунт успешна.")
    except Exception as e:
        raise SystemExit(f"🔥🔥 ОШИБКА АУТЕНТИФИКАЦИИ: {e}")

    # Получение списка источников
    try:
        dashboard_spreadsheet = gc.open_by_key(DASHBOARD_AND_SETTINGS_SHEET_ID)
        master_sheet = dashboard_spreadsheet.worksheet(SETTINGS_WORKSHEET_NAME)
        sources_df = pd.DataFrame(master_sheet.get_all_records())
        print(f"✅ Найдено {len(sources_df)} источников в таблице настроек.")
    except Exception as e:
        raise SystemExit(f"🔥🔥 ОШИБКА чтения настроек: {e}")

    # Сбор данных из всех источников
    all_leads_dfs = []
    for index, row in sources_df.iterrows():
        team_name = row.get('Название команды', f'Источник {index+1}')
        sheet_id = row['ID текущей таблицы']
        if not sheet_id: 
            print(f"  - Пропущен '{team_name}' (ID не указан).")
            continue

        try:
            print(f"  - Обработка '{team_name}'...")
            worksheet = gc.open_by_key(sheet_id).worksheet(CRM_WORKSHEET_NAME)
            data = worksheet.get_all_values()
            if len(data) < 2: 
                print(f"    -> Пропущено (лист пустой).")
                continue

            df = pd.DataFrame(data[1:], columns=data[0])
            df['Источник (Команда)'] = team_name
            all_leads_dfs.append(df)
            print(f"    -> Успешно! Прочитано {len(df)} строк.")
        except Exception as e:
            print(f"    -> 🔥 ОШИБКА для '{team_name}': {e}")
    
    if not all_leads_dfs:
        print("⚠️ Не удалось собрать данные ни из одного источника. Завершение.")
        return

    # Объединение и выгрузка
    final_df = pd.concat(all_leads_dfs, ignore_index=True)
    print(f"✅ Итого собрано {len(final_df)} строк.")
    
    try:
        target_spreadsheet = dashboard_spreadsheet # Используем уже открытую таблицу
        try:
            worksheet_to_write = target_spreadsheet.worksheet(TARGET_WORKSHEET_NAME)
            worksheet_to_write.clear()
        except gspread.exceptions.WorksheetNotFound:
            worksheet_to_write = target_spreadsheet.add_worksheet(title=TARGET_WORKSHEET_NAME, rows=1, cols=1)

        final_df_list = [final_df.columns.values.tolist()] + final_df.fillna("").astype(str).values.tolist()
        worksheet_to_write.update(final_df_list, value_input_option='USER_ENTERED')
        worksheet_to_write.format('A1:Z1', {'textFormat': {'bold': True}})
        print(f"🎉 УСПЕХ! Данные выгружены на лист '{TARGET_WORKSHEET_NAME}'.")
    except Exception as e:
        raise SystemExit(f"🔥🔥 ОШИБКА выгрузки данных: {e}")

if __name__ == "__main__":
    run_etl()
