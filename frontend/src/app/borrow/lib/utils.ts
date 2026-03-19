export function formatCategoryLabel(cat: string) {
  if (!cat) return '';
  return cat
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

