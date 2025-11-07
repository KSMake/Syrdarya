import { ObjectTypeConfig } from '../types';

export const OBJECT_TYPES: ObjectTypeConfig[] = [
  {
    type: 'reservoir',
    label: 'Водохранилище',
    measures: ['приток', 'попуск', 'объем']
  },
  {
    type: 'canal',
    label: 'Канал',
    measures: ['расход']
  },
  {
    type: 'hes',
    label: 'ГЭС',
    measures: ['сброс']
  },
  {
    type: 'hydropost',
    label: 'Гидропост',
    measures: ['расход', 'рейка']
  }
];

export const getObjectTypeConfig = (type: string): ObjectTypeConfig | undefined => {
  return OBJECT_TYPES.find(t => t.type === type);
};

export const getMeasuresForType = (type: string): string[] => {
  const config = getObjectTypeConfig(type);
  return config ? config.measures : [];
};

export const detectObjectType = (objectName: string): 'reservoir' | 'canal' | 'hes' | 'hydropost' => {
  const nameLower = objectName.toLowerCase();

  if (nameLower.includes('вдхр') || nameLower.includes('водохранилище')) {
    return 'reservoir';
  }

  if (nameLower.includes('гэс')) {
    return 'hes';
  }

  if (nameLower.includes('канал')) {
    return 'canal';
  }

  return 'hydropost';
};
