/* ── 완료 화면 피드백 ──
   수업을 끝냈을 때 "무엇을 해냈는지"를 한 장씩 보여주는 문구들.

   ⚠️ **배지(수집·보관) 개념이 아니다.** MVP에서는 그 자리에서 보여주고 끝나는 피드백일 뿐이고,
   모아두거나 프로필에 쌓이지 않는다. 배지 기능은 나중에 별도로 붙인다 — 그때까지 화면에
   '배지'라는 말을 쓰지 않는다.

   기준: **가만히 있어도 받는 것은 넣지 않는다.** 참여만으로 주는 완료 도장이나 시간·추이 같은
   부수 지표는 "잘했다"는 신호를 싸구려로 만든다. 실제로 잘한 것만 말한다. */

export interface Badge {
  id: string
  icon: string
  label: string
  description: string
}

interface BadgeInput {
  correctCount: number
  totalCount: number
  isFirstTime: boolean
  /** 세션 정리(핵심 문장 채우기) 결과 — 유형학습 수업만 넘긴다. 실전 정답률과 별개 축이다:
   *  실전은 "풀 수 있나", 정리는 "배운 걸 말로 꺼낼 수 있나". */
  recap?: { correct: number; total: number }
}

/* `results`(문항별 정오답)는 지금 어느 문구도 쓰지 않지만 인자로 남겨둔다 — 호출부(완료 플로우·
   화면 갤러리)가 이미 넘기고 있고, 문항 단위 조건이 다시 생길 자리다. */
export function computeBadges(input: BadgeInput, _results: boolean[]): Badge[] {
  const { correctCount, totalCount, isFirstTime, recap } = input
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100
  const badges: Badge[] = []

  // 실전 만점
  if (totalCount > 0 && correctCount === totalCount) {
    badges.push({
      id: 'perfect',
      icon: '🏆',
      label: '완벽 풀이',
      description: `${totalCount}문제 모두 정답! 훌륭해요.`,
    })
  }

  /* 실전 고득점 — 만점은 아니어도 80% 넘겼으면 그것대로 짚어준다.
     만점이면 위에서 '완벽 풀이'가 나가므로 중복해서 주지 않는다. */
  if (totalCount > 0 && correctCount < totalCount && score >= 80) {
    badges.push({
      id: 'high-score',
      icon: '🎯',
      label: '실전 고득점',
      description: `실전 ${score}% — 배운 전략이 먹혔어요.`,
    })
  }

  /* '3연속 정답' 은 뺐다 — 몇 문항을 맞혔느냐(만점·고득점)와 같은 것을 순서만 바꿔 두 번
     칭찬하는 문구였다. 4문항짜리 실전에서는 80% 만 넘겨도 거의 항상 같이 떠서, 성취 문구가
     두 장 연달아 나오는 대신 한 장의 무게가 가벼워졌다. */

  // 정리 단계 — 배운 표현을 스스로 꺼냈는가. 만점일 때만 말한다
  if (recap && recap.total > 0 && recap.correct === recap.total) {
    badges.push({
      id: 'recap-perfect',
      icon: '🧠',
      label: '표현 완벽 정리',
      description: '핵심 문장을 하나도 안 틀렸어요!',
    })
  }

  // 첫 완주
  if (isFirstTime) {
    badges.push({
      id: 'first',
      icon: '🌟',
      label: '첫 완주',
      description: '이 수업을 처음으로 완료했어요!',
    })
  }

  return badges
}
