// src/boot/quasar-lang.ts

import { boot } from 'quasar/wrappers';
import { Quasar } from 'quasar';
import type { QuasarLanguage } from 'quasar';
import langRu from 'quasar/lang/ru';

/**
 * Безопасная функция для создания переводов selectedRecords
 */
function createSelectedRecordsTranslation(rows: number): string {
  if (!Number.isInteger(rows) || rows < 0) {
    return 'Неверное количество записей';
  }

  if (rows === 0) {
    return 'Записи не выбраны';
  }

  if (rows === 1) {
    return '1 запись выбрана.';
  }

  // Правильная русская локализация для множественного числа
  const lastDigit = rows % 10;
  const lastTwoDigits = rows % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${rows} записей выбрано.`;
  }

  switch (lastDigit) {
    case 1:
      return `${rows} запись выбрана.`;
    case 2:
    case 3:
    case 4:
      return `${rows} записи выбраны.`;
    default:
      return `${rows} записей выбрано.`;
  }
}

/**
 * Безопасная функция для создания пагинации
 */
function createPaginationTranslation(start: number, end: number, total: number): string {
  if (!Number.isInteger(start) || !Number.isInteger(end) || !Number.isInteger(total)) {
    return 'Неверные параметры пагинации';
  }

  if (start < 0 || end < 0 || total < 0 || start > end || end > total) {
    return 'Неверный диапазон пагинации';
  }

  return `${start}-${end} из ${total}`;
}

/**
 * Кастомизация русского языкового пакета (только реально существующие поля)
 */
const customRuLang: QuasarLanguage = {
  ...langRu,
  table: {
    ...langRu.table,
    recordsPerPage: 'Записей на странице:',
    noData: 'Нет данных',
    noResults: 'Нет данных после фильтрации',
    loading: 'Загрузка...',
    selectedRecords: createSelectedRecordsTranslation,
    allRows: 'Все',
    pagination: createPaginationTranslation,
    columns: 'Столбцы',
  },
} as const;

/**
 * Функция для безопасной установки языка с правильной обработкой типов
 */
function setQuasarLanguageSafely(language: QuasarLanguage, ssrContext?: unknown): void {
  try {
    // Проверяем окружение и применяем язык соответственно
    if (typeof window === 'undefined' || ssrContext !== undefined) {
      // SSR режим - преобразуем любой ssrContext в Record<string, unknown>
      const safeContext: Record<string, unknown> = {};

      // Безопасно копируем свойства из ssrContext если он существует
      if (ssrContext && typeof ssrContext === 'object') {
        Object.assign(safeContext, ssrContext);
      }

      Quasar.lang.set(language, safeContext);
    } else {
      // SPA режим - используем overload без второго параметра
      (Quasar.lang.set as (lang: QuasarLanguage) => void)(language);
    }

    // Убираем console.log для production
    if (process.env.DEV) {
      console.log(`✅ Quasar language set to: ${language.isoName}`);
    }
  } catch (error) {
    // Логируем только в development режиме
    if (process.env.DEV) {
      console.error('❌ Failed to set Quasar language:', error);
    }

    // Fallback к стандартному русскому пакету
    try {
      if (typeof window === 'undefined' || ssrContext !== undefined) {
        Quasar.lang.set(langRu, {});
      } else {
        (Quasar.lang.set as (lang: QuasarLanguage) => void)(langRu);
      }

      if (process.env.DEV) {
        console.warn('⚠️ Fallback to standard Russian language pack');
      }
    } catch (fallbackError) {
      if (process.env.DEV) {
        console.error('❌ Critical: Failed to set fallback language:', fallbackError);
      }
    }
  }
}

/**
 * Boot функция для инициализации языкового пакета
 */
export default boot(({ ssrContext }) => {
  try {
    // Валидация кастомного языкового пакета
    if (!customRuLang?.isoName || !customRuLang?.table) {
      throw new Error('Custom language pack is malformed');
    }

    // Применяем кастомный языковой пакет с правильной типизацией
    // Используем unknown для безопасного приведения типов
    setQuasarLanguageSafely(customRuLang, ssrContext as unknown);
  } catch (error) {
    if (process.env.DEV) {
      console.error('Error in quasar-lang boot:', error);
    }

    // Emergency fallback к стандартному пакету
    try {
      setQuasarLanguageSafely(langRu, ssrContext as unknown);
      if (process.env.DEV) {
        console.warn('⚠️ Using standard Russian language pack due to error');
      }
    } catch (criticalError) {
      if (process.env.DEV) {
        console.error('❌ Critical language initialization error:', criticalError);
      }
    }
  }
});

// Экспорт для использования в компонентах
export { customRuLang };
