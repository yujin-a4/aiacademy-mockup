import { NextRequest, NextResponse } from 'next/server'
import { getSubjectChoiceRow } from '@/data/db/lessonContentStore'

/**
 * 문항의 "주어가 뭐야?" 같은 세부 질문용 선택지를 DB(현재는 목업 테이블)에서 조회한다.
 * 클라이언트는 이 응답을 그대로 버튼으로 렌더링한다 — 선택지 텍스트를 코드에 하드코딩하지 않는다.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 })
  }

  const row = await getSubjectChoiceRow(id)
  if (!row) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  return NextResponse.json(row)
}
