export function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export function findElementByText(container, text) {
  return Array.from(container.querySelectorAll('*')).find(
    el => el.textContent && el.textContent.includes(text)
  );
}

export function findButtonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find(
    btn => btn.textContent && btn.textContent.includes(text)
  );
}

export function findClickableItemByText(container, text) {
  return Array.from(container.querySelectorAll('.activity-item--clickable')).find(
    el => el.textContent && el.textContent.includes(text)
  );
}
