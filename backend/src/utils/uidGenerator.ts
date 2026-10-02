export const generateUID = () => {
  return "UID-" + Math.random().toString(36).substring(2, 10).toUpperCase();
};
