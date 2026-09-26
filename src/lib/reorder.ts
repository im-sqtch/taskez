import { arrayMove } from '@dnd-kit/sortable'

export function reorderItems<T>(items: T[], oldIndex: number, newIndex: number): T[] {
  return arrayMove(items, oldIndex, newIndex)
}
