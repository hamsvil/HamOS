/* eslint-disable no-useless-assignment */
export const addTouchFeedback = (element: HTMLElement) => {
  element.addEventListener('touchstart', () => {
    element.style.opacity = '0.7';
    element.style.transform = 'scale(0.98)';
  });
  element.addEventListener('touchend', () => {
    element.style.opacity = '1';
    element.style.transform = 'scale(1)';
  });
};
