export const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian',
  'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Russian',
  'Arabic', 'Hindi', 'Bengali', 'Urdu', 'Indonesian',
  'Dutch', 'Turkish', 'Vietnamese', 'Polish', 'Swedish',
  'Norwegian', 'Danish', 'Finnish', 'Greek', 'Czech',
  'Romanian', 'Hungarian', 'Thai', 'Malay', 'Tagalog'
];

export const EDUCATION = ['Bachelors', 'In College', 'High School', 'PhD', 'In Grad School', 'Masters'];
export const GENDERS = ['masculino', 'femenino', 'otro'];
export const COUNTRIES = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica',
  'Cuba', 'Ecuador', 'El Salvador', 'España', 'Estados Unidos', 'Guatemala',
  'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú',
  'Puerto Rico', 'República Dominicana', 'Uruguay', 'Venezuela', 'Otro'
];

export const LIMITS = {
  nameMax: 20,
  aboutMeMax: 500,
  heightMin: 100,
  heightMax: 250,
  photosMin: 1,
  photosMax: 9,
  ageMin: 18,
  ageMax: 99,
  imageMaxBytes: 5242880
};

export const COLORS = {
  sky: '#6BB8E0',
  'sky-deep': '#3B7BC0',
  sunny: '#E8C845',
  grass: '#5BBF6B',
  berry: '#D94F4F',
  'bubble-me': '#B8E8C4',
  'bubble-them': '#B8D4F0',
  background: '#F5F0E8',
  card: '#FDFBF5',
  primary: '#4B8FD4',
  foreground: '#2A2E4A',
  'muted-foreground': '#7A7E9A',
  border: '#C8C4D8',
  destructive: '#D44040'
};

export const BASE_URL = 'https://people-finder-backend.onrender.com';

export const calculateAge = (birthDateString: string): number => {
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};
