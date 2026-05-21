import DrawingToolbar, { type DrawingState } from './DrawingToolbar'

interface ClassroomToolbarProps {
  onDrawingChange?: (state: DrawingState) => void
  onClearAll?: () => void
}

export default function ClassroomToolbar({ onDrawingChange, onClearAll }: ClassroomToolbarProps) {
  return (
    <div className="flex items-center px-4 py-3 gap-2">
      <div className="flex-1 min-w-0 overflow-hidden">
        <DrawingToolbar onChange={onDrawingChange} onClearAll={onClearAll} />
      </div>
    </div>
  )
}
