/* 자동 생성 — scripts/build-fgi-scenario.js (시트 "시트66")
 *
 * FGI 시연용 **대본 수업**. 평소 수업은 레일(단계)만 정해 두고 강사 발화는 LLM 이 만드는데,
 * 시연 강의는 할 말을 미리 다 정해 둔다. 여기 있는 turns 가 그 대본이다.
 *
 * ⚠️ 손으로 고치지 말 것 — 시트가 정본이다. 고칠 일이 생기면 시트를 고치고 생성기를 다시 돌린다.
 */
import type { Turn } from '@/data/typeLearning/types'

/** 강의코드 → 대본 턴. 여기 있는 강의는 레일 대신 이 턴으로 돈다. */
export const FGI_SCENARIO: Record<string, Turn[]> = {
  'LC-P1-01': [
    {
      "no": 1,
      "itemSeq": 1,
      "occurrence": 1,
      "stage": "S1 핵심 단서 찾기",
      "tutor": "좋아요, 첫 번째 사진부터 빠르게 핵심을 잡아볼게요. 이 사진에서는 사람과 사물 중에서 무엇을 먼저 봐야 할까요?",
      "focusQ": 0,
      "interaction": {
        "kind": "choice",
        "prompt": "좋아요, 첫 번째 사진부터 빠르게 핵심을 잡아볼게요. 이 사진에서는 사람과 사물 중에서 무엇을 먼저 봐야 할까요?",
        "fixedPrompt": true,
        "choices": [
          {
            "text": "사람",
            "correct": true
          },
          {
            "text": "사물"
          }
        ]
      }
    },
    {
      "no": 2,
      "itemSeq": 1,
      "occurrence": 1,
      "stage": "S1 핵심 단서 찾기",
      "tutor": "맞아요. 사람이 중심인 사진이니까 이 여자가 지금 무엇을 하고 있는지 한번 말해볼까요?",
      "focusQ": 0,
      "interaction": {
        "kind": "subjective",
        "prompt": "맞아요. 사람이 중심인 사진이니까 이 여자가 지금 무엇을 하고 있는지 한번 말해볼까요?",
        "hint": "그림을 그리고 있어요."
      }
    },
    {
      "no": 3,
      "itemSeq": 1,
      "occurrence": 1,
      "stage": "학생 풀이",
      "tutor": "좋습니다. 지금 확인한 '여자가 하고 있는 동작'을 기억하면서 네 개의 문장을 들어보세요. 사진을 가장 정확하게 설명하는 문장을 골라볼게요.",
      "focusQ": 0,
      "audio": {
        "kind": "options",
        "qIdx": 0,
        "labels": [
          "A",
          "B",
          "C",
          "D"
        ]
      },
      "interaction": {
        "kind": "pickAnswer",
        "qIdx": 0
      }
    },
    {
      "no": 4,
      "itemSeq": 1,
      "occurrence": 1,
      "stage": "S3 개념 코칭",
      "tutor": "사람 중심 사진에서는 주변에 어떤 물건이 있는지만 보는 것보다, 사람이 지금 실제로 하고 있는 동작을 먼저 잡는 것이 훨씬 중요해요.",
      "focusQ": 0,
      "interaction": {
        "kind": "next"
      }
    },
    {
      "no": 5,
      "itemSeq": 1,
      "occurrence": 1,
      "stage": "S3 개념 코칭",
      "tutor": "그리고 여기서 paint라는 표현도 하나 챙겨갈게요. paint가 항상 '페인트칠하다'라는 뜻은 아니고, paint a picture라고 하면 '그림을 그리다'라는 뜻으로 사용돼요.",
      "focusQ": 0,
      "interaction": {
        "kind": "next"
      }
    },
    {
      "no": 6,
      "itemSeq": 1,
      "occurrence": 1,
      "stage": "S5 정답 근거 연결",
      "tutor": "그럼 B 문장에서 사진 속 여자의 동작을 가장 직접적으로 설명하고 있는 표현이 무엇이었는지 말해볼까요?",
      "focusQ": 0,
      "interaction": {
        "kind": "subjective",
        "prompt": "그럼 B 문장에서 사진 속 여자의 동작을 가장 직접적으로 설명하고 있는 표현이 무엇이었는지 말해볼까요?",
        "hint": "painting a picture요."
      }
    },
    {
      "no": 7,
      "itemSeq": 1,
      "occurrence": 1,
      "stage": "S6 오답 제거",
      "tutor": "이번에는 A를 볼게요. A에서는 여자가 싱크대에서 붓을 헹구고 있다고 했는데, 사진에 실제로 그런 장면이 보이나요?",
      "focusQ": 0,
      "interaction": {
        "kind": "choice",
        "prompt": "이번에는 A를 볼게요. A에서는 여자가 싱크대에서 붓을 헹구고 있다고 했는데, 사진에 실제로 그런 장면이 보이나요?",
        "fixedPrompt": true,
        "choices": [
          {
            "text": "맞아요"
          },
          {
            "text": "아니에요",
            "correct": true
          }
        ]
      }
    },
    {
      "no": 8,
      "itemSeq": 1,
      "occurrence": 1,
      "stage": "S6 오답 제거",
      "tutor": "D에서는 여자가 물감 튜브를 손에 들고 있다고 했어요. 사진 속 여자가 실제로 물감 튜브를 들고 있나요?",
      "focusQ": 0,
      "interaction": {
        "kind": "choice",
        "prompt": "D에서는 여자가 물감 튜브를 손에 들고 있다고 했어요. 사진 속 여자가 실제로 물감 튜브를 들고 있나요?",
        "fixedPrompt": true,
        "choices": [
          {
            "text": "맞아요"
          },
          {
            "text": "아니에요",
            "correct": true
          }
        ]
      }
    },
    {
      "no": 9,
      "itemSeq": 1,
      "occurrence": 1,
      "stage": "S7 표현 정리",
      "tutor": "좋아요. 첫 번째 사진에서 꼭 기억할 포인트만 정리하고 갈게요. 사람이 중심인 사진에서는 무엇을 가장 먼저 확인해야 할까요?",
      "focusQ": 0,
      "interaction": {
        "kind": "subjective",
        "prompt": "좋아요. 첫 번째 사진에서 꼭 기억할 포인트만 정리하고 갈게요. 사람이 중심인 사진에서는 무엇을 가장 먼저 확인해야 할까요?",
        "hint": "동작부터요."
      }
    },
    {
      "no": 10,
      "itemSeq": 2,
      "occurrence": 2,
      "stage": "S1 핵심 단서 찾기",
      "tutor": "이번 사진은 앞 문제와 조금 다르죠. 사진 속에 사람이 있는지 없는지 먼저 확인해볼까요?",
      "focusQ": 1,
      "interaction": {
        "kind": "subjective",
        "prompt": "이번 사진은 앞 문제와 조금 다르죠. 사진 속에 사람이 있는지 없는지 먼저 확인해볼까요?",
        "hint": "없어요."
      }
    },
    {
      "no": 11,
      "itemSeq": 2,
      "occurrence": 2,
      "stage": "S1 핵심 단서 찾기",
      "tutor": "맞아요. 사람이 없는 사진에서는 동작을 찾으려고 하기보다 사물이 어디에 있고 어떤 상태인지 보는 게 중요해요. 그럼 신발들은 지금 어떻게 놓여 있는지 말해볼까요?",
      "focusQ": 1,
      "interaction": {
        "kind": "subjective",
        "prompt": "맞아요. 사람이 없는 사진에서는 동작을 찾으려고 하기보다 사물이 어디에 있고 어떤 상태인지 보는 게 중요해요. 그럼 신발들은 지금 어떻게 놓여 있는지 말해볼까요?",
        "hint": "나란히 놓여 있어요."
      }
    },
    {
      "no": 12,
      "itemSeq": 2,
      "occurrence": 2,
      "stage": "학생 풀이",
      "tutor": "좋아요. 방금 확인한 신발의 위치와 상태를 기억하면서 네 개의 문장을 들어보세요. 사진과 가장 잘 맞는 문장을 골라볼게요.",
      "focusQ": 1,
      "audio": {
        "kind": "options",
        "qIdx": 1,
        "labels": [
          "A",
          "B",
          "C",
          "D"
        ]
      },
      "interaction": {
        "kind": "pickAnswer",
        "qIdx": 1
      }
    },
    {
      "no": 13,
      "itemSeq": 2,
      "occurrence": 2,
      "stage": "S3 개념 코칭",
      "tutor": "여기에서 꼭 알아둘 표현이 be lined up인데요. 여러 개의 사물이 한 줄로 나란히 놓여 있는 상태를 나타낼 때 자주 사용해요.",
      "focusQ": 1,
      "interaction": {
        "kind": "next"
      }
    },
    {
      "no": 14,
      "itemSeq": 2,
      "occurrence": 2,
      "stage": "S5 정답 근거 연결",
      "tutor": "A에서는 신발이 줄지어 있다는 것뿐 아니라 위치까지 함께 설명했어요. 신발이 어디에 있다고 했는지 말해볼까요?",
      "focusQ": 1,
      "interaction": {
        "kind": "subjective",
        "prompt": "A에서는 신발이 줄지어 있다는 것뿐 아니라 위치까지 함께 설명했어요. 신발이 어디에 있다고 했는지 말해볼까요?",
        "hint": "on the floor요."
      }
    },
    {
      "no": 15,
      "itemSeq": 2,
      "occurrence": 2,
      "stage": "S6 오답 제거",
      "tutor": "이번에는 B를 확인해볼게요. folded and stacked는 옷이 접힌 뒤 여러 겹으로 쌓여 있다는 뜻인데, 사진 속 옷이 그런 상태로 보이나요?",
      "focusQ": 1,
      "interaction": {
        "kind": "choice",
        "prompt": "이번에는 B를 확인해볼게요. folded and stacked는 옷이 접힌 뒤 여러 겹으로 쌓여 있다는 뜻인데, 사진 속 옷이 그런 상태로 보이나요?",
        "fixedPrompt": true,
        "choices": [
          {
            "text": "맞아요"
          },
          {
            "text": "아니에요",
            "correct": true
          }
        ]
      }
    },
    {
      "no": 16,
      "itemSeq": 2,
      "occurrence": 2,
      "stage": "S6 오답 제거",
      "tutor": "D에서는 모자가 선반 위에 보관되어 있다고 했어요. 사진 속 사물의 종류와 위치를 확인했을 때 이 설명은 맞나요?",
      "focusQ": 1,
      "interaction": {
        "kind": "choice",
        "prompt": "D에서는 모자가 선반 위에 보관되어 있다고 했어요. 사진 속 사물의 종류와 위치를 확인했을 때 이 설명은 맞나요?",
        "fixedPrompt": true,
        "choices": [
          {
            "text": "맞아요"
          },
          {
            "text": "아니에요",
            "correct": true
          }
        ]
      }
    },
    {
      "no": 17,
      "itemSeq": 2,
      "occurrence": 2,
      "stage": "S7 표현 정리",
      "tutor": "좋아요. 그러면 사람이 없는 사진을 볼 때는 어떤 정보를 먼저 확인해야 하는지 한번 정리해서 말해볼까요?",
      "focusQ": 1,
      "interaction": {
        "kind": "subjective",
        "prompt": "좋아요. 그러면 사람이 없는 사진을 볼 때는 어떤 정보를 먼저 확인해야 하는지 한번 정리해서 말해볼까요?",
        "hint": "위치랑 상태를 봐요."
      }
    },
    {
      "no": 18,
      "itemSeq": 3,
      "occurrence": 3,
      "stage": "S1 핵심 단서 찾기",
      "tutor": "이번 사진은 상태 표현을 조금 더 정확하게 구분해야 하는 문제예요. 화분들이 지금 어떤 동작을 하고 있는 중인가요, 아니면 이미 놓여 있는 상태인가요?",
      "focusQ": 2,
      "interaction": {
        "kind": "choice",
        "prompt": "이번 사진은 상태 표현을 조금 더 정확하게 구분해야 하는 문제예요. 화분들이 지금 어떤 동작을 하고 있는 중인가요, 아니면 이미 놓여 있는 상태인가요?",
        "fixedPrompt": true,
        "choices": [
          {
            "text": "화분들이 지금 어떤 동작을 하고 있는 중"
          },
          {
            "text": "놓여 있는 상태",
            "correct": true
          }
        ]
      }
    },
    {
      "no": 19,
      "itemSeq": 3,
      "occurrence": 3,
      "stage": "학생 풀이",
      "tutor": "좋아요. 이번에는 문장에서 '동작이 진행 중인지', 아니면 '이미 만들어진 상태인지'를 구분해서 들어보세요. 정답을 골라볼게요.",
      "focusQ": 2,
      "audio": {
        "kind": "options",
        "qIdx": 2,
        "labels": [
          "A",
          "B",
          "C",
          "D"
        ]
      },
      "interaction": {
        "kind": "pickAnswer",
        "qIdx": 2
      }
    },
    {
      "no": 20,
      "itemSeq": 3,
      "occurrence": 3,
      "stage": "S3 개념 코칭",
      "tutor": "이 문제는 자주 헷갈리는 표현 차이가 핵심이에요. are being watered와 have been lined up은 비슷하게 수동 형태가 들어가지만 의미는 다릅니다.",
      "focusQ": 2,
      "interaction": {
        "kind": "next"
      }
    },
    {
      "no": 21,
      "itemSeq": 3,
      "occurrence": 3,
      "stage": "S3 개념 코칭",
      "tutor": "are being watered는 누군가가 지금 화분에 물을 주고 있는 동작이 진행 중이라는 뜻이고, have been lined up은 화분들이 이미 줄지어 놓인 상태라는 뜻이에요.",
      "focusQ": 2,
      "interaction": {
        "kind": "next"
      }
    },
    {
      "no": 22,
      "itemSeq": 3,
      "occurrence": 3,
      "stage": "S5 정답 근거 연결",
      "tutor": "그럼 사진에서 실제로 확인할 수 있는 모습은 둘 중 어느 쪽인가요? 지금 물을 주는 동작인가요, 아니면 화분들이 줄지어 놓인 상태인가요?",
      "focusQ": 2,
      "interaction": {
        "kind": "choice",
        "prompt": "지금 물을 주는 동작인가요, 아니면 화분들이 줄지어 놓인 상태인가요?",
        "fixedPrompt": true,
        "choices": [
          {
            "text": "물을 주는 동작"
          },
          {
            "text": "화분들이 줄지어 놓인 상태",
            "correct": true
          }
        ]
      }
    },
    {
      "no": 23,
      "itemSeq": 3,
      "occurrence": 3,
      "stage": "S6 오답 제거",
      "tutor": "A가 정답이 되려면 단순히 화분이 있는 것만으로는 부족해요. 사진에서 어떤 동작이 실제로 보여야 할까요?",
      "focusQ": 2,
      "interaction": {
        "kind": "subjective",
        "prompt": "A가 정답이 되려면 단순히 화분이 있는 것만으로는 부족해요. 사진에서 어떤 동작이 실제로 보여야 할까요?",
        "hint": "물을 주는 장면이요."
      }
    },
    {
      "no": 24,
      "itemSeq": 3,
      "occurrence": 3,
      "stage": "S6 오답 제거",
      "tutor": "이번에는 B를 볼게요. B에 나온 shovel은 '삽'이라는 뜻인데, 사진 속에 삽이 보이나요?",
      "focusQ": 2,
      "interaction": {
        "kind": "choice",
        "prompt": "이번에는 B를 볼게요. B에 나온 shovel은 '삽'이라는 뜻인데, 사진 속에 삽이 보이나요?",
        "fixedPrompt": true,
        "choices": [
          {
            "text": "맞아요"
          },
          {
            "text": "아니에요",
            "correct": true
          }
        ]
      }
    },
    {
      "no": 25,
      "itemSeq": 3,
      "occurrence": 3,
      "stage": "S7 표현 정리",
      "tutor": "좋아요. 이 문제에서 제일 중요한 포인트만 기억하고 갈게요. being p.p.가 들리면 단순히 사물이 보이는지만 확인하지 말고, 그 동작이 실제로 진행되고 있는지도 꼭 확인해야 해요.",
      "focusQ": 2,
      "interaction": {
        "kind": "next"
      }
    }
  ],
}

/** 이 강의가 대본 수업인가 */
export const hasScenario = (code?: string) => !!code && !!FGI_SCENARIO[code]
