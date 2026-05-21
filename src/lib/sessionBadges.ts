export interface Badge {
  id: string
  icon: string
  label: string
  description: string
}

interface BadgeInput {
  correctCount: number
  totalCount: number
  elapsedSeconds: number
  previousScore: number | null
  isFirstTime: boolean
}

function maxStreak(results: boolean[]): number {
  let max = 0, cur = 0
  for (const r of results) {
    if (r) { cur++; if (cur > max) max = cur }
    else cur = 0
  }
  return max
}

export function computeBadges(input: BadgeInput, results: boolean[]): Badge[] {
  const { correctCount, totalCount, elapsedSeconds, previousScore, isFirstTime } = input
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100
  const badges: Badge[] = []

  // 항상 부여: 수업 완료
  badges.push({
    id: 'completion',
    icon: '✅',
    label: '수업 완료',
    description: '오늘 수업을 끝마쳤어요!',
  })

  // 만점
  if (totalCount > 0 && correctCount === totalCount) {
    badges.push({
      id: 'perfect',
      icon: '🏆',
      label: '완벽 풀이',
      description: `${totalCount}문제 모두 정답! 훌륭해요.`,
    })
  }

  // 3연속 정답
  if (results.length >= 3 && maxStreak(results) >= 3) {
    badges.push({
      id: 'streak',
      icon: '🔥',
      label: '3연속 정답',
      description: '집중력이 대단해요!',
    })
  }

  // 빠른 학습 (10분 이내)
  if (elapsedSeconds > 0 && elapsedSeconds < 10 * 60) {
    badges.push({
      id: 'fast',
      icon: '⚡',
      label: '빠른 학습',
      description: '10분 안에 완료했어요!',
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

  // 실력 향상
  if (previousScore !== null && score > previousScore) {
    badges.push({
      id: 'improvement',
      icon: '📈',
      label: '실력 향상',
      description: `지난번보다 ${score - previousScore}점 올랐어요!`,
    })
  }

  return badges
}
