/* 자동 생성 — scripts/build-fgi-scenario.js
 *
 * FGI 시연용 **대본 수업**. 평소 수업은 레일(단계)만 정해 두고 강사 발화는 LLM 이 만드는데,
 * 시연 강의는 할 말을 미리 다 정해 둔다. 여기 있는 turns 가 그 대본이다.
 *
 * **강사 → 강의** 두 겹인 이유: 같은 문항이라도 강사마다 짚는 순서와 시키는 방식이 다르다.
 * 대본이 없는 강사로 열면 이 파일을 쓰지 않고 평소대로 레일 + LLM 으로 돈다.
 *
 * turns  = 스캐폴딩 수업 (강사와 같이 푼다)
 * review = 실전을 혼자 다 푼 뒤의 문항별 코칭 (대본이 있으면 **다 맞혀도** 이 단계를 지난다)
 *
 * ⚠️ 손으로 고치지 말 것 — 시트가 정본이다. 고칠 일이 생기면 시트를 고치고 생성기를 다시 돌린다.
 */
import type { Turn } from '@/data/typeLearning/types'

export interface ScriptedLesson {
  /** 수업(스캐폴딩) 턴 */
  turns: Turn[]
  /** 실전 뒤 코칭 턴 — 비어 있으면 화면이 틀린 문항만 골라 스스로 만든다 */
  review: Turn[]
  /** 도입 화면 — 강사 발화(문단은 줄바꿈으로 나뉜다)와 '오늘 배울 내용'.
   *  없으면 화면이 단계명에서 뽑아 쓴다(S1·S3… 이 그대로 올라와 학생에게는 아무 말도 아니다). */
  intro?: { script: string; points: string[] }
}

/** 강사코드 → 강의코드 → 대본. 여기 있는 조합만 대본으로 돈다. */
export const FGI_SCENARIO: Record<string, Record<string, ScriptedLesson>> = {
  yun_daeun: {
    'LC-P1-01': {
      intro: {
        "script": "오늘은 Part 1에서 이 세 가지를 중심으로 연습해볼게요.\n먼저 Part 1 문제를 어떻게 풀어야 하는지 간단히 살펴보고 시작할게요.\nPart 1은 사진을 보고 네 개의 문장을 들은 다음, 사진을 가장 정확하게 설명하는 문장 하나를 고르는 문제예요.\n그래서 음원을 듣기 전에 사진부터 빠르게 살펴보는 게 중요해요. 사람이 중심인 사진에서는 사람의 동작을, 사물이 중심인 사진에서는 사물의 위치나 상태를 먼저 확인하면 됩니다.\n그리고 사진에 어떤 물건이 보인다고 해서 바로 답을 고르면 안 돼요. 누가 무엇을 하고 있는지, 사물이 어디에 있고 어떤 상태인지까지 선택지와 정확하게 일치하는지 확인해야 해요.\n이제 방금 본 세 가지 포인트를 문제에 적용해볼게요. 첫 번째 유형부터 시작해볼까요?",
        "points": [
          "사람이 무엇을 하고 있는지 빠르게 찾기",
          "사물이 어디에 있고 어떤 상태인지 확인하기",
          "진행 중인 동작과 이미 만들어진 상태 구분하기"
        ]
      },
      turns: [
        {
          "no": 1,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "첫 번째 사진부터 빠르게 핵심을 잡아볼게요. 이 사진에서는 사람과 사물 중에서 무엇을 먼저 봐야 할까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "첫 번째 사진부터 빠르게 핵심을 잡아볼게요. 이 사진에서는 사람과 사물 중에서 무엇을 먼저 봐야 할까요?",
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
          "tutor": "B에 easel이 나왔죠. easel은 그림 그릴 때 캔버스를 세우기 위해 사용하는 것이에요. 그러면 사진에서 여자는 이젤 앞에서 뭘 하고 있었죠?",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "subjective",
            "prompt": "B에 easel이 나왔죠. easel은 그림 그릴 때 캔버스를 세우기 위해 사용하는 것이에요. 그러면 사진에서 여자는 이젤 앞에서 뭘 하고 있었죠?",
            "hint": "그림을 그리고 있어요."
          }
        },
        {
          "no": 6,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. 사진에서도 여자가 이젤 앞에서 그림을 그리고 있었죠. B의 The woman is painting a picture on an easel.과 정확히 일치하니까 정답은 B예요.",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 7,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거",
          "tutor": "이번에는 A를 볼게요. rinse는 '물로 헹구다'라는 뜻이에요. 그래서 rinse a paintbrush는 '붓을 헹구다'가 됩니다. 여자가 싱크대에서 붓을 헹구고 있다고 했는데, 사진에 실제로 그런 장면이 보이나요?",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "이번에는 A를 볼게요. rinse는 '물로 헹구다'라는 뜻이에요. 그래서 rinse a paintbrush는 '붓을 헹구다'가 됩니다. 여자가 싱크대에서 붓을 헹구고 있다고 했는데, 사진에 실제로 그런 장면이 보이나요?",
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
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "D"
                ]
              }
            ]
          },
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
          "tutor": "좋아요. 사람 중심 사진에서는 사람의 무엇을 먼저 봐야 하죠?",
          "focusQ": 0,
          "interaction": {
            "kind": "subjective",
            "prompt": "좋아요. 사람 중심 사진에서는 사람의 무엇을 먼저 봐야 하죠?",
            "hint": "동작이요."
          }
        },
        {
          "no": 10,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "마무리 멘트",
          "tutor": "잘했어요! 그럼 다음 사진으로 넘어갈게요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 11,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번 사진도 빠르게 핵심을 잡아볼게요. 이 사진에서는 사람과 사물 중에서 무엇을 먼저 봐야 할까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "이번 사진도 빠르게 핵심을 잡아볼게요. 이 사진에서는 사람과 사물 중에서 무엇을 먼저 봐야 할까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "사람"
              },
              {
                "text": "사물",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 12,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "맞아요. 사람이 중심이 아니니까 사물의 위치나 상태를 봐야 해요. 사진 속 물건들이 어떻게 놓여 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "subjective",
            "prompt": "맞아요. 사람이 중심이 아니니까 사물의 위치나 상태를 봐야 해요. 사진 속 물건들이 어떻게 놓여 있나요?",
            "hint": "옷들이 옷걸이에 걸려 있어요",
            "accepts": [
              "옷들이 옷걸이에 걸려 있어요",
              "모자가 벽에 걸려 있어요.",
              "신발들이 바닥에 놓여 있어요."
            ]
          }
        },
        {
          "no": 13,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "학생 풀이",
          "tutor": "좋습니다. 방금 확인한 물건들의 상태를 기억하면서 네 개의 문장을 들어보세요. 사진을 가장 정확하게 설명하는 문장을 골라볼게요.",
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
          "no": 14,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "사물 중심 사진에서는 무엇이 있는지만 보는 게 아니라, 사물이 어디에 있고 어떤 상태인지를 같이 확인하는 게 중요해요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 15,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "A에 are lined up이 나왔죠. line up은 '줄을 세우다'이고, be + p.p. 형태인 are lined up은 '줄지어 놓여 있다'처럼 사물의 상태를 나타낼 수 있어요. 그러면 사진 속 신발들은 줄지어 놓여 있나요?",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "A에 are lined up이 나왔죠. line up은 '줄을 세우다'이고, be + p.p. 형태인 are lined up은 '줄지어 놓여 있다'처럼 사물의 상태를 나타낼 수 있어요. 그러면 사진 속 신발들은 줄지어 놓여 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "맞아요",
                "correct": true
              },
              {
                "text": "아니에요"
              }
            ]
          }
        },
        {
          "no": 16,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "여기서 하나만 구분해볼게요. are lined up은 이미 줄지어 놓여 있는 상태, are being lined up은 지금 누군가 줄을 세우고 있는 중이에요. 사진은 어느 쪽에 가까워요?",
          "focusQ": 1,
          "interaction": {
            "kind": "subjective",
            "prompt": "여기서 하나만 구분해볼게요. are lined up은 이미 줄지어 놓여 있는 상태, are being lined up은 지금 누군가 줄을 세우고 있는 중이에요. 사진은 어느 쪽에 가까워요?",
            "hint": "이미 줄지어 놓여 있는 상태요."
          }
        },
        {
          "no": 17,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. 사진 속의 신발들 중 2켤레의 신발들이 바닥에 줄지어 놓여 있고, A도 Some of the shoes are lined up on the floor.라고 했으니까 정답은 A예요.",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 18,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거",
          "tutor": "이번에는 B를 볼게요. fold는 '접다', stack은 '쌓다'라는 뜻이에요. B에서는 옷이 접혀서 쌓여 있다고 했는데, 사진에 그런 모습이 보이나요?",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "이번에는 B를 볼게요. fold는 '접다', stack은 '쌓다'라는 뜻이에요. B에서는 옷이 접혀서 쌓여 있다고 했는데, 사진에 그런 모습이 보이나요?",
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
          "no": 19,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거",
          "tutor": "C에서는 핸드백이 바구니 위에 놓여 있다고 했어요. 사진 속 핸드백의 위치와 맞나요?",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "C에서는 핸드백이 바구니 위에 놓여 있다고 했어요. 사진 속 핸드백의 위치와 맞나요?",
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
          "no": 20,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S7 표현 정리",
          "tutor": "좋아요. 사람이 중심이 아닌 사진에서는 사물의 무엇을 확인해야 하죠?",
          "focusQ": 1,
          "interaction": {
            "kind": "subjective",
            "prompt": "좋아요. 사람이 중심이 아닌 사진에서는 사물의 무엇을 확인해야 하죠?",
            "hint": "위치나 상태요."
          }
        },
        {
          "no": 21,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "마무리 멘트",
          "tutor": "좋아요! 다음 문제로 넘어갈게요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 22,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번 사진도 사람이 중심인 사진일까요, 사물이 중심인 사진일까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "이번 사진도 사람이 중심인 사진일까요, 사물이 중심인 사진일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "사람이 중심인 사진"
              },
              {
                "text": "사물이 중심인 사진",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 23,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "맞아요. 그럼 사진 속에서 보이는 사물에 대해서 묘사해볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "subjective",
            "prompt": "맞아요. 그럼 사진 속에서 보이는 사물에 대해서 묘사해볼까요?",
            "hint": "화분들이 여러 개 있어요.",
            "accepts": [
              "화분들이 여러 개 있어요.",
              "화분들이 선반 위에 놓여 있어요.",
              "화분들이 줄지어 놓여 있어요.",
              "온실 안에 식물과 화분들이 있어요."
            ]
          }
        },
        {
          "no": 24,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "학생 풀이",
          "tutor": "좋습니다. 화분의 위치와 상태를 생각하면서 네 문장을 들어보세요. 사진을 가장 정확하게 설명하는 문장을 골라볼게요.",
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
          "no": 25,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "좋아요. 이번 문제에서는 수동태의 '진행 중인 동작'과 '이미 만들어진 상태'를 구분하는 게 중요해요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 26,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "A의 are being watered는 식물들이 지금 누군가에게 물을 받고 있는 중이라는 뜻이에요. 반면 D의 have been lined up은 화분들이 이미 줄지어 놓여 있는 상태를 말해요. 사진에서는 지금 식물에 물을 주는 동작이 보이나요, 아니면 화분들이 이미 줄지어 놓여 있나요?",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "A",
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "subjective",
            "prompt": "A의 are being watered는 식물들이 지금 누군가에게 물을 받고 있는 중이라는 뜻이에요. 반면 D의 have been lined up은 화분들이 이미 줄지어 놓여 있는 상태를 말해요. 사진에서는 지금 식물에 물을 주는 동작이 보이나요, 아니면 화분들이 이미 줄지어 놓여 있나요?",
            "hint": "이미 줄지어 놓여 있어요."
          }
        },
        {
          "no": 27,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. 사진에서는 물을 주는 동작이 진행 중인 게 아니라 화분들이 선반에 이미 줄지어 놓여 있죠. 그래서 Some pots have been lined up on a shelf.가 정답이에요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 28,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거",
          "tutor": "B도 표현 하나 볼게요. shovel은 삽, shed는 작은 창고예요. 그리고 prop A against B는 A를 B에 기대어 세워두다라는 뜻이에요. 그래서 이 문장은 '삽이 창고에 기대어 세워져 있다'는 뜻이에요. 사진에 삽이 보이나요?",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "A",
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "B도 표현 하나 볼게요. shovel은 삽, shed는 작은 창고예요. 그리고 prop A against B는 A를 B에 기대어 세워두다라는 뜻이에요. 그래서 이 문장은 '삽이 창고에 기대어 세워져 있다'는 뜻이에요. 사진에 삽이 보이나요?",
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
          "no": 29,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거",
          "tutor": "C에서는 scatter를 알아두면 좋아요. be scattered는 여기저기 흩어져 있다라는 뜻이고, across the ground는 '바닥 여기저기에'라는 의미예요. 그래서 전체적으로는 '큰 잎들이 바닥에 여기저기 흩어져 있다'는 뜻인데, 사진과 맞나요?",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "C에서는 scatter를 알아두면 좋아요. be scattered는 여기저기 흩어져 있다라는 뜻이고, across the ground는 '바닥 여기저기에'라는 의미예요. 그래서 전체적으로는 '큰 잎들이 바닥에 여기저기 흩어져 있다'는 뜻인데, 사진과 맞나요?",
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
          "no": 30,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S7 표현 정리",
          "tutor": "좋아요. being p.p.가 들리면 사진에서 실제로 그 동작이 진행 중인지 확인해요. 반대로 have been lined up처럼 이미 만들어진 결과를 나타내면 지금 보이는 상태와 맞는지를 확인하면 돼요.",
          "focusQ": 2,
          "interaction": {
            "kind": "subjective",
            "prompt": "좋아요. being p.p.가 들리면 사진에서 실제로 그 동작이 진행 중인지 확인해요. 반대로 have been lined up처럼 이미 만들어진 결과를 나타내면 지금 보이는 상태와 맞는지를 확인하면 돼요.",
            "hint": "실제로 그 동작이 진행 중인지 확인해요."
          }
        },
        {
          "no": 31,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "마무리 멘트",
          "tutor": "좋아요, 잘했어요! 이제 진행 중인 동작과 이미 만들어진 상태를 구분해서 들을 수 있겠죠? 다음으로 넘어갈게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        }
      ],
      review: [
        {
          "no": 32,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이 문제는 사진부터 다시 한번 볼게요. 사진 속 사람의 행동이나 사물을 묘사해볼까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "subjective",
            "prompt": "이 문제는 사진부터 다시 한번 볼게요. 사진 속 사람의 행동이나 사물을 묘사해볼까요?",
            "hint": "남자가 있고 컵과 커피 머신이 보여요. 남자가 컵을 집어 들고 있어요."
          }
        },
        {
          "no": 33,
          "stage": "S6 오답 제거 - A",
          "tutor": "좋아요. 그럼 A부터 하나씩 확인해볼게요. tie an apron은 '앞치마를 매다'라는 뜻이에요. 사진 속 남자가 지금 앞치마를 매고 있나요?",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "좋아요. 그럼 A부터 하나씩 확인해볼게요. tie an apron은 '앞치마를 매다'라는 뜻이에요. 사진 속 남자가 지금 앞치마를 매고 있나요?",
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
          "no": 34,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 pour A into B는 'A를 B 안에 붓다'라는 뜻이에요. 그래서 pour beans into a coffee machine은 커피 머신 안에 원두를 붓는다는 뜻이죠. 사진 속 행동과 일치하나요?",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "B의 pour A into B는 'A를 B 안에 붓다'라는 뜻이에요. 그래서 pour beans into a coffee machine은 커피 머신 안에 원두를 붓는다는 뜻이죠. 사진 속 행동과 일치하나요?",
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
          "no": 35,
          "stage": "S3 개념 코칭",
          "tutor": "여기서 하나 기억할게요. 사진에 앞치마나 커피 머신이 실제로 보여도, 문장에서 말하는 동작까지 같아야 정답이 될 수 있어요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 36,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 'hand A to B'는 'A에게 B를 건네다'는 뜻이에요. 이 보기가 맞으려면 ① 손님에게 음료를 건네는 모습 ② 컵을 집어 드는 모습 중 어떤 장면이 보여야 할까요?",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "C의 'hand A to B'는 'A에게 B를 건네다'는 뜻이에요. 이 보기가 맞으려면 ① 손님에게 음료를 건네는 모습 ② 컵을 집어 드는 모습 중 어떤 장면이 보여야 할까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "손님에게 음료를 건네는 모습",
                "correct": true
              },
              {
                "text": "컵을 집어 드는 모습"
              }
            ]
          }
        },
        {
          "no": 37,
          "stage": "S5 정답 근거 연결 - D",
          "tutor": "마지막 D의 pick up은 '집어 들다'라는 뜻이에요. 사진 속 남자의 실제 행동과 맞나요?",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "마지막 D의 pick up은 '집어 들다'라는 뜻이에요. 사진 속 남자의 실제 행동과 맞나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "맞아요",
                "correct": true
              },
              {
                "text": "아니에요"
              }
            ]
          }
        },
        {
          "no": 38,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. 남자가 빈 컵을 집어 들고 있으니까 He's picking up an empty cup.이 사진과 정확히 일치해요. 그래서 정답은 D예요.",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 39,
          "stage": "S7 표현 정리",
          "tutor": "표현만 정리하고 갈게요. tie an apron은 '앞치마를 매다', pour A into B는 'A를 B 안에 붓다', hand A to B는 'A를 B에게 건네다', pick up은 '집어 들다'예요.",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "A",
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 40,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번 사진은 사물이 여러 개 보이네요. 사진에 무엇이 있고, 각각 어디에 놓여 있는지 묘사해볼까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "subjective",
            "prompt": "이번 사진은 사물이 여러 개 보이네요. 사진에 무엇이 있고, 각각 어디에 놓여 있는지 묘사해볼까요?",
            "hint": "소파와 테이블이 있고 벽에 그림이 걸려 있어요.",
            "accepts": [
              "소파와 테이블이 있고 벽에 그림이 걸려 있어요.",
              "테이블 위에는 책이나 잡지가 있고 화분도 보여요."
            ]
          }
        },
        {
          "no": 41,
          "stage": "S5 정답 근거 연결 - A",
          "tutor": "A부터 볼게요. artwork는 그림이나 작품 같은 미술품이고, be hanging on a wall은 '벽에 걸려 있다'라는 뜻이에요. 사진과 일치하나요?",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "A부터 볼게요. artwork는 그림이나 작품 같은 미술품이고, be hanging on a wall은 '벽에 걸려 있다'라는 뜻이에요. 사진과 일치하나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "맞아요",
                "correct": true
              },
              {
                "text": "아니에요"
              }
            ]
          }
        },
        {
          "no": 42,
          "stage": "S6 오답 제거 - B",
          "tutor": "A는 일단 사진과 맞네요. 그래도 나머지 보기까지 확인해볼게요. B의 reading materials는 책이나 잡지 같은 읽을거리예요. 사진에서는 읽을거리가 소파 위에 있나요, 테이블 위에 있나요?",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "subjective",
            "prompt": "A는 일단 사진과 맞네요. 그래도 나머지 보기까지 확인해볼게요. B의 reading materials는 책이나 잡지 같은 읽을거리예요. 사진에서는 읽을거리가 소파 위에 있나요, 테이블 위에 있나요?",
            "hint": "테이블 위에 있어요."
          }
        },
        {
          "no": 43,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 are being installed는 '지금 설치되고 있는 중'이라는 뜻이에요. 사진에서 창문을 설치하는 동작이 실제로 진행되고 있나요?",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "C의 are being installed는 '지금 설치되고 있는 중'이라는 뜻이에요. 사진에서 창문을 설치하는 동작이 실제로 진행되고 있나요?",
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
          "no": 44,
          "stage": "S3 개념 코칭",
          "tutor": "맞아요. 특히 being p.p.가 나오면 그 사물이 사진에 있는지만 보는 게 아니라, 실제로 그 동작을 받고 있는 중인지 확인해야 해요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 45,
          "stage": "S6 오답 제거 - D",
          "tutor": "D에서는 potted plants, 즉 화분에 심긴 식물들이 바닥에 넘어져 있다고 했어요. 사진 속 화분은 어떤 상태인가요?",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "subjective",
            "prompt": "D에서는 potted plants, 즉 화분에 심긴 식물들이 바닥에 넘어져 있다고 했어요. 사진 속 화분은 어떤 상태인가요?",
            "hint": "넘어져 있지 않고 세워져 있어요."
          }
        },
        {
          "no": 46,
          "stage": "S5 정답 확정",
          "tutor": "그렇죠. B는 위치가 다르고, C와 D는 상태가 달랐어요. A만 미술품이 벽에 걸려 있는 모습을 정확하게 설명하니까 정답은 A예요.",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "A",
                  "B",
                  "C",
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 47,
          "stage": "S7 표현 정리",
          "tutor": "이 문제에서는 사물의 존재뿐 아니라 위치와 상태까지 정확히 비교하는 것이 중요했어요. artwork는 '미술품', reading materials는 '읽을거리', be installed는 '설치되다'로 기억해둘게요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 48,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번 사진도 먼저 전체를 볼게요. 사진 속 두 사람이 취하고 있는 행동이나 자세를 묘사해볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "subjective",
            "prompt": "이번 사진도 먼저 전체를 볼게요. 사진 속 두 사람이 취하고 있는 행동이나 자세를 묘사해볼까요?",
            "hint": "여자 두 명이 있고 유리 진열대와 쇼핑 카트가 보여요. 한 여자는 진열대 쪽에 팔을 올리고 있어요."
          }
        },
        {
          "no": 49,
          "stage": "S6 오답 제거 - A",
          "tutor": "좋아요. A의 reach into는 '~안으로 손을 뻗다'라는 뜻이에요. 한 여성이 실제로 쇼핑 카트 안으로 손을 뻗고 있나요?",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "좋아요. A의 reach into는 '~안으로 손을 뻗다'라는 뜻이에요. 한 여성이 실제로 쇼핑 카트 안으로 손을 뻗고 있나요?",
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
          "no": 50,
          "stage": "S5 정답 근거 연결 - B",
          "tutor": "B에서는 resting her arm on a glass counter라고 했어요. 여기서 rest one's arm on ~은 '팔을 ~에 기대거나 올려두다'라는 뜻이에요. 사진 속 여성의 자세와 맞나요?",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "B에서는 resting her arm on a glass counter라고 했어요. 여기서 rest one's arm on ~은 '팔을 ~에 기대거나 올려두다'라는 뜻이에요. 사진 속 여성의 자세와 맞나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "맞아요",
                "correct": true
              },
              {
                "text": "아니에요"
              }
            ]
          }
        },
        {
          "no": 51,
          "stage": "S3 개념 코칭",
          "tutor": "좋아요. rest를 무조건 '쉬다'로만 보면 안 돼요. rest + 신체 부위 + on ~ 형태로 나오면 신체 부위를 ~에 기대거나 올려두는 의미로도 자주 쓰여요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 52,
          "stage": "S6 오답 제거 - C",
          "tutor": "C에서는 여성이 계산대의 버튼을 누르고 있다고 했어요. 실제 행동은 버튼을 누르는 것과 팔을 진열대에 올려두는 것 중 어느 쪽인가요?",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "subjective",
            "prompt": "C에서는 여성이 계산대의 버튼을 누르고 있다고 했어요. 실제 행동은 버튼을 누르는 것과 팔을 진열대에 올려두는 것 중 어느 쪽인가요?",
            "hint": "팔을 진열대에 올려두고 있어요."
          }
        },
        {
          "no": 53,
          "stage": "S6 오답 제거 - D",
          "tutor": "마지막 D의 display case는 상품을 넣어 보여주는 진열장이에요. 여성이 진열장을 열고 있는 모습인가요?",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "마지막 D의 display case는 상품을 넣어 보여주는 진열장이에요. 여성이 진열장을 열고 있는 모습인가요?",
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
          "no": 54,
          "stage": "S5 정답 확정",
          "tutor": "맞아요. A, C, D에서 말한 동작은 실제로 하지 않고 있고, B에서 말한 자세만 사진과 일치해요. 그래서 정답은 B예요.",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "B",
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 55,
          "stage": "S7 표현 정리",
          "tutor": "reach into ~는 '~안으로 손을 뻗다', rest one's arm on ~은 '팔을 ~에 기대다', display case는 '진열장'이에요. 사람이 여러 명 나오면 각 사람의 행동과 자세를 따로 확인해보세요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 56,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이 사진도 전체부터 살펴볼게요. 사진에 보이는 사물과 각각 어떻게 배치되어 있는지 묘사해볼까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "subjective",
            "prompt": "이 사진도 전체부터 살펴볼게요. 사진에 보이는 사물과 각각 어떻게 배치되어 있는지 묘사해볼까요?",
            "hint": "책상과 의자가 여러 개 있고 책상 사이에 칸막이가 있어요. 쓰레기통도 있고 사무실처럼 보여요."
          }
        },
        {
          "no": 57,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 Trash bins are being emptied.는 '쓰레기통들이 지금 비워지고 있는 중이다'라는 뜻이에요. 사진에는 쓰레기통이 있지만 실제로 비워지고 있나요?",
          "focusQ": 3,
          "reveal": {
            "optionText": [
              {
                "qIdx": 3,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "A의 Trash bins are being emptied.는 '쓰레기통들이 지금 비워지고 있는 중이다'라는 뜻이에요. 사진에는 쓰레기통이 있지만 실제로 비워지고 있나요?",
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
          "no": 58,
          "stage": "S3 개념 코칭",
          "tutor": "그렇죠. 사물이 존재하는 것과 그 사물에 관한 동작이 실제로 진행되는 것은 달라요. 특히 being p.p.는 사진에서 그 동작이 진행 중인지 꼭 확인해야 해요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 59,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 along a wall은 '벽을 따라서'라는 뜻이에요. 사진 속 의자는 벽을 따라서 놓여 있나요, 책상 앞에 놓여 있나요?",
          "focusQ": 3,
          "reveal": {
            "optionText": [
              {
                "qIdx": 3,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "subjective",
            "prompt": "B의 along a wall은 '벽을 따라서'라는 뜻이에요. 사진 속 의자는 벽을 따라서 놓여 있나요, 책상 앞에 놓여 있나요?",
            "hint": "책상 앞에 놓여 있어요."
          }
        },
        {
          "no": 60,
          "stage": "S5 정답 근거 연결 - C",
          "tutor": "C의 partition은 '칸막이'이고, be divided with ~는 '~로 나뉘어 있다'라는 뜻이에요. 사진에서도 책상 공간이 칸막이로 나뉘어 있나요?",
          "focusQ": 3,
          "reveal": {
            "optionText": [
              {
                "qIdx": 3,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "C의 partition은 '칸막이'이고, be divided with ~는 '~로 나뉘어 있다'라는 뜻이에요. 사진에서도 책상 공간이 칸막이로 나뉘어 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "맞아요",
                "correct": true
              },
              {
                "text": "아니에요"
              }
            ]
          }
        },
        {
          "no": 61,
          "stage": "S6 오답 제거 - D",
          "tutor": "D에는 a stack of documents라는 표현이 나와요. '서류 한 무더기'라는 뜻인데, 문장에서는 각 업무 공간마다 서류 더미가 있다고 했어요. 사진과 맞나요?",
          "focusQ": 3,
          "reveal": {
            "optionText": [
              {
                "qIdx": 3,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "D에는 a stack of documents라는 표현이 나와요. '서류 한 무더기'라는 뜻인데, 문장에서는 각 업무 공간마다 서류 더미가 있다고 했어요. 사진과 맞나요?",
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
          "no": 62,
          "stage": "S5 정답 확정",
          "tutor": "좋아요. A는 동작이 다르고, B는 배치가 다르고, D는 사진에 없는 상태를 말했어요. 책상 공간이 칸막이로 나뉘어 있다는 C만 정확하게 일치하니까 정답은 C예요.",
          "focusQ": 3,
          "reveal": {
            "optionText": [
              {
                "qIdx": 3,
                "labels": [
                  "A",
                  "B",
                  "C",
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 63,
          "stage": "S7 표현 정리",
          "tutor": "이 문장에서 쓰인 be being emptied는 '지금 비워지고 있는 중', along a wall은 '벽을 따라서', partition은 '칸막이', a stack of documents는 '서류 한 더미' 기억해둘게요!",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        }
      ],
    },
  },
  lee_doyun: {
    'LC-P1-01': {
      intro: {
        "script": "오늘은 토익 시험에서 제일 먼저 만나게 될 Part 1 사람과 사물 사진이 나오는 문제를 공부해볼 거예요. 가장 쉬워보이지만, 간혹 어려운 문제가 나오면 만점 받기 쉽지 않기도 해요. Part 1 공부의 핵심은 인물과 사물의 상태를 나타내는 표현 외우기예요! 자, 이제 수업하러 가볼까요?",
        "points": [
          "사람은 '무엇을 하는지' 먼저 보기",
          "사물은 '어디에 어떤 상태인지' 먼저 보기",
          "사진과 다른 동작·사물·위치 빠르게 지우기"
        ]
      },
      turns: [
        {
          "no": 1,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "사진 먼저 봐볼게요. 지금 이 사진에는 여자가 보이죠? 이렇게 인물이 나오는 사진에서는 인물이 어떤 동작을 하고 있는지, 무엇을 들고 있는지, 어떤 자세로 있는지 잘 봐야 해요. 여자가 무엇을 하고 있나요?",
          "focusQ": 0,
          "interaction": {
            "kind": "subjective",
            "prompt": "이렇게 인물이 나오는 사진에서는 인물이 어떤 동작을 하고 있는지, 무엇을 들고 있는지, 어떤 자세로 있는지 잘 봐야 해요. 여자가 무엇을 하고 있나요?",
            "hint": "(붓으로) 그림을 그리고 있어요"
          }
        },
        {
          "no": 2,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "학생 풀이",
          "tutor": "맞아요. 여자가 앉아서 붓으로 그림을 그리고 있죠? 이 정도로 사진 파악했으면 이제 선택지 듣고 문제 풀어볼게요.",
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
          "no": 3,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭",
          "tutor": "자, 문제 다 풀었으니깐 여기서 포인트 한번 짚고 갈게요. 사진에서 인물이 '지금 ~하고 있다'는 동작을 나타낼 때는 주로 어떤 형태로 표현할까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "subjective",
            "prompt": "자, 문제 다 풀었으니깐 여기서 포인트 한번 짚고 갈게요. 사진에서 인물이 '지금 ~하고 있다'는 동작을 나타낼 때는 주로 어떤 형태로 표현할까요?",
            "hint": "be +",
            "accepts": [
              "be +",
              "ing 진행형"
            ]
          }
        },
        {
          "no": 4,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭",
          "tutor": "맞아요. 인물이 지금 하고 있는 동작은 주로 be + -ing 형태로 표현해요. 그래서 인물이 등장하는 사진에서는 선택지를 들을 때 인물의 핵심 동작을 나타내는 동사를 먼저 잡는 게 중요해요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 5,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "풀이 결과가 정답일 때 이제 선택지 봐볼게요. 정답은 B죠? 잘 맞혔어요! 풀이 결과가 오답일 때 이제 선택지 봐볼게요. 정답은 B였어요. 이런 문제는 시험장 가면 꼭 맞혀주고 넘어가야 해요. 어떤 부분에서 헷갈려서 틀렸는지 같이 확인해볼게요.",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 6,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "정답 B를 다시 들어볼게요. The woman is painting a picture on an easel. 재생",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 7,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "여기서 핵심 동작을 나타내는 동사 표현은 무엇인가요?",
          "focusQ": 0,
          "interaction": {
            "kind": "subjective",
            "prompt": "여기서 핵심 동작을 나타내는 동사 표현은 무엇인가요?",
            "hint": "is painting painting"
          }
        },
        {
          "no": 8,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요, is painting이 핵심이에요. 그 뒤에는 on an easel이 나오죠. easel은 그림 그릴 때 그림판을 놓는 틀이에요. 그런데 이젤 뜻 몰라도 일단 여자가 무언가 위에 그림을 그리고 있다는 의미죠? 이렇게 핵심 동사는 맞는데 뒤에 나온 단어 잘 모르겠으면 일단 정답 후보로 두고 다른 선택지를 확실히 지워가면 돼요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 9,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (A)",
          "tutor": "그럼 선택지 A 볼게요.The woman is rinsing a paintbrush in a sink. 핵심 동사 is rinsing 뒤에 in a sink가 나오죠. 여기서도 rinsing 뜻 몰라도 확실히 아닌 거 뭐예요?",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "subjective",
            "prompt": "그럼 선택지 A 볼게요.The woman is rinsing a paintbrush in a sink. 핵심 동사 is rinsing 뒤에 in a sink가 나오죠. 여기서도 rinsing 뜻 몰라도 확실히 아닌 거 뭐예요?",
            "hint": "in a sink 싱크"
          }
        },
        {
          "no": 10,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (A)",
          "tutor": "그렇죠! 사진에 싱크대는 아예 안나오죠? 참고로 rinse는 헹구다 라는 뜻이에요. 싱크대에서 붓을 헹구는 장면은 사진에 없죠. 이렇게 동사 뜻을 잘 모르거나 정확히 못들었어도, 뒤에 들린 사물이나 장소가 사진에 아예 없으면 오답으로 지우고 넘기면 돼요.",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 11,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (C)",
          "tutor": "다음 선택지 C 볼게요. The woman is visiting an art gallery. 이건 진짜 아니죠? is visiting, art gallery 둘다 전혀 사진에 등장하지 않으니깐 바로 X 하고 넘겨요.",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 12,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (D)",
          "tutor": "마지막으로 선택지 D 볼게요. The woman is holding a tube of paint. is holding, a tube of paint 가 들리죠. 사진에서 여자가 물감 튜브를 들고 있나요?",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "마지막으로 선택지 D 볼게요. The woman is holding a tube of paint. is holding, a tube of paint 가 들리죠. 사진에서 여자가 물감 튜브를 들고 있나요?",
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
          "no": 13,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (D)",
          "tutor": "맞아요. 물감 튜브를 들고 있지 않으니깐 이것도 오답으로 넘기면 돼요.",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 14,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S7 표현 정리",
          "tutor": "그럼 마지막으로 핵심 정리하고 갈게요. 인물이 등장하는 선택지를 들으면 가장 먼저 핵심 동사를 확인하고, 뒤에 나오는 사물이나 장소가 맞는지 확인하면 돼요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 15,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "마무리 멘트",
          "tutor": "이제 다음 문제로 넘어가볼게요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 16,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번 사진에는 사람은 안보이고 사물, 풍경만 보이죠? 이렇게 사물, 풍경만 나오는 사진에서는 사물의 위치와 배치를 잘 확인해야 해요. 뭐가 보이나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "subjective",
            "prompt": "이렇게 사물, 풍경만 나오는 사진에서는 사물의 위치와 배치를 잘 확인해야 해요. 뭐가 보이나요?",
            "hint": "옷장, 행거에 걸린 옷, 선반"
          }
        },
        {
          "no": 17,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "학생 풀이",
          "tutor": "맞아요. 행거에 옷이 걸려있고 왼쪽에 선반에 물건이 쌓여있고 우측 벽에는 모자가 있어요. 이제 선택지 듣고 문제 풀어볼게요.",
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
          "no": 18,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "자, 문제 다 풀었으니깐 여기서 포인트 한번 짚고 갈게요. 사진에서 사람이 사물을 놓는 중인가요, 사물이 이미 놓여 있는 상태인가요?",
          "focusQ": 1,
          "interaction": {
            "kind": "subjective",
            "prompt": "자, 문제 다 풀었으니깐 여기서 포인트 한번 짚고 갈게요. 사진에서 사람이 사물을 놓는 중인가요, 사물이 이미 놓여 있는 상태인가요?",
            "hint": "사물이 놓여 있는 상태"
          }
        },
        {
          "no": 19,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "그렇죠! 렇게 사람이 사물을 옮기거나 놓는 행동이 진행 중인 게 아니라, 사물이 이미 어떤 상태로 놓여 있을 때 be + p.p.나 have/has been + p.p. 형태가 자주 나와요. Part 1에서는 두 형태 모두 사물이 이미 어떤 상태로 놓여 있을 때 쓰여요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 20,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "풀이 결과가 정답일 때 이제 선택지 봐볼게요. 정답은 A죠. 잘 맞혔어요! 풀이 결과가 오답일 때 이제 선택지 봐볼게요. 정답은 A였어요. 어떤 부분이 어려웠는지 정답이랑 오답 같이 확인해볼게요.",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 21,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "정답 A를 다시 들어볼게요. Some of the shoes are lined up on the floor. 재생",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 22,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "일부 신발이, are lined up 줄 세워져 있다, on the floor 바닥에 라고 했죠. 사진에서 신발이 여러 개 있고, 그 중 일부가 줄 세워져 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "일부 신발이, are lined up 줄 세워져 있다, on the floor 바닥에 라고 했죠. 사진에서 신발이 여러 개 있고, 그 중 일부가 줄 세워져 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "맞아요",
                "correct": true
              },
              {
                "text": "아니에요"
              }
            ]
          }
        },
        {
          "no": 23,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "그렇죠! 신발 중 일부가 바닥에 줄지어 놓여 있으니까 some of the shoes와 on the floor가 사진과 정확히 맞아요. 또 누군가 신발을 줄 세우는 중이 아니라 신발이 이미 줄지어 있는 상태이기 때문에 are lined up도 잘 맞죠. 여기서 line up은 '한 줄로 세우다'라는 뜻이에요. 사물 사진에서 자주 나오는 표현이니깐 외워두세요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 24,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (B)",
          "tutor": "다음으로 선택지 B 볼게요. Clothing has been folded and stacked. 옷이 개어져서 쌓여 있지 않죠? 오답으로 X 하고 넘어가면 돼요.",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 25,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (C)",
          "tutor": "다음 선택지 C A handbag has been left on top of a basket. 은 완전 오답이죠? 핸드백이 바구니 위에 없으니깐 빠르게 넘겨버려요.",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 26,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (D)",
          "tutor": "마지막 D 봐볼게요. Hats are being stored on some shelves. are being stored처럼 be being p.p.는 누군가에 의해 어떤 행동이 진행되고 있는 게 사진에서 보여야 해요. 그런데 사진에서 모자가 선반에 옮겨져 보관되는 중인 게 보이나요?",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "마지막 D 봐볼게요. Hats are being stored on some shelves. are being stored처럼 be being p.p.는 누군가에 의해 어떤 행동이 진행되고 있는 게 사진에서 보여야 해요. 그런데 사진에서 모자가 선반에 옮겨져 보관되는 중인 게 보이나요?",
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
          "no": 27,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (D)",
          "tutor": "맞아요. be being pp가 나오면 누군가에 의해 모자가 보관되는 장면이 나와야 해요. 그리고 on some shelves라는 위치도 사진과 맞지 않으니깐 오답입니다.",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 28,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 정리할게요. 사물 사진은 '어디에 어떻게 놓여 있는지'를 먼저 보고, 이미 놓인 상태인지 누군가에 의해 놓여지고 있는지 구분하세요. be lined up은 '줄지어 놓여 있다', stack은 '쌓다' 였어요. 외워두고 가세요!",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 29,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "마무리 멘트",
          "tutor": "그럼 이제 실전 문제로 넘어가볼게요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 30,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번에는 조금 어려운 문제 가볼게요. 이것도 사물과 풍경이 중심인 사진이에요. 사물 사진에서는 무엇이 어디에 있고, 어떤 상태인지 먼저 확인한다고 했죠? 사진에서 눈에 띄는 사물과 위치를 말해볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "subjective",
            "prompt": "사진에서 눈에 띄는 사물과 위치를 말해볼까요?",
            "hint": "화분, 식물, 선반 등"
          }
        },
        {
          "no": 31,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "학생 풀이",
          "tutor": "좋아요. 사진 속 사물과 위치를 확인했으니 이제 선택지를 듣고 정답을 골라볼게요.",
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
          "no": 32,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "그럼 한번만 더 포인트 짚고 가볼게요.사물이 이미 어떤 상태로 놓여 있으면 be + p.p.나 have/has been + p.p. 형태가 자주 나온다고 했죠? 반대로 be being + p.p.는 어떤 행동이 지금 진행되고 있을 때 쓰인다고 했어요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 33,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "풀이 결과가 정답일 때 이제 선택지 봐볼게요. 정답은 D죠. 잘 맞혔어요! 풀이 결과가 오답일 때 이제 선택지 봐볼게요. 정답은 D였어요. 어떤 부분이 헷갈렸는지 정답이랑 오답을 같이 확인해볼게요.",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 34,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "정답 D를 다시 들어볼게요. Some pots have been lined up on a shelf. 재생",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 35,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "Some pots 일부 화분들이, have been lined up 줄지어 놓여 있다, on a shelf 선반 위에라고 했어요. 사진에서 일부 화분이 선반 위에 줄지어 놓여 있나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "Some pots 일부 화분들이, have been lined up 줄지어 놓여 있다, on a shelf 선반 위에라고 했어요. 사진에서 일부 화분이 선반 위에 줄지어 놓여 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "맞아요",
                "correct": true
              },
              {
                "text": "아니에요"
              }
            ]
          }
        },
        {
          "no": 36,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "그렇죠! 사진에 화분들이 선반 위에 줄지어 놓여 있으니까 some pots, lined up, on a shelf가 모두 사진과 맞아요. 그리고 지금 누군가 화분을 줄 세우는 중이 아니라 이미 줄지어 놓인 상태이기 때문에 have been lined up도 잘 맞아요. line up은 앞 문제에서도 나왔죠? 사물 사진에서 자주 나오는 표현이에요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 37,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (A)",
          "tutor": "이제 A 볼게요. Some greenhouse plants are being watered. are being watered는 식물에 물을 주는 행동이 지금 진행되고 있다는 뜻이에요. 사진에서 실제로 식물에 물을 주는 행동이 진행되고 있나요?",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "이제 A 볼게요. Some greenhouse plants are being watered. are being watered는 식물에 물을 주는 행동이 지금 진행되고 있다는 뜻이에요. 사진에서 실제로 식물에 물을 주는 행동이 진행되고 있나요?",
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
          "no": 38,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (A)",
          "tutor": "맞아요. 식물은 보이더라도 물을 주는 행동은 진행되고 있지 않죠. 사진에 있는 사물이 들렸다고 바로 정답으로 고르면 안 돼요. be being + p.p.가 들리면 그 행동이 실제로 진행 중인지까지 확인하세요.",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 39,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "다음 B는 A shovel has been propped against a shed.라고 했어요. 이 선택지는 단어가 좀 어려웠죠? shovel은 '삽', shed는 '창고' 라는 뜻이에요. 여기서 동사 prop 모른다고 해도 사진에 삽이 있어요, 없어요?",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "subjective",
            "prompt": "shovel은 '삽', shed는 '창고' 라는 뜻이에요. 여기서 동사 prop 모른다고 해도 사진에 삽이 있어요, 없어요?",
            "hint": "없어요"
          }
        },
        {
          "no": 40,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "그렇죠. 사진에 삽이 없으니까 이 단어만 알아도 바로 X 할 수 있어요. prop against 는 '~를 ~에 기대어 세워두다'라는 뜻이에요. 지금 나온 단어랑 표현들 꼭 외워두세요.",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 41,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (C)",
          "tutor": "다음 C는 Large leaves are scattered across the ground. 예요. scattered는 '흩어져 있는'이라는 뜻이에요. 사진에서 큰 나뭇잎들이 바닥 여기저기에 흩어져 있지 않으니깐 오답이에요.",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 42,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 오늘 나온 빈출 표현 정리할 게요. line up은 '줄지어 놓다', prop against는 '~에 기대어 세우다', scatter는 '흩어 놓다'라는 뜻이었어요. 이 정도 어휘는 꼭 외워두세요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 43,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "마무리 멘트",
          "tutor": "좋아요. 이제 실전 문제로 넘어가볼게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        }
      ],
      review: [
        {
          "no": 44,
          "stage": "S5 정답 근거 연결",
          "tutor": "정답 D를 다시 들어볼게요. He's picking up an empty cup. 재생",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 45,
          "stage": "S5 정답 근거 연결",
          "tutor": "is picking up, 집어 들고 있다, an empty cup, 빈 컵을이라고 했죠. 사진에서 남자가 빈 컵을 집어 들고 있나요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "is picking up, 집어 들고 있다, an empty cup, 빈 컵을이라고 했죠. 사진에서 남자가 빈 컵을 집어 들고 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "맞아요",
                "correct": true
              },
              {
                "text": "아니에요"
              }
            ]
          }
        },
        {
          "no": 46,
          "stage": "S5 정답 근거 연결",
          "tutor": "그렇죠. 인물 사진에서는 가장 먼저 사람이 실제로 하고 있는 동작을 확인해야 해요. 남자가 빈 컵을 집어 들고 있으니까 사진과 정확히 맞죠? pick up은 '집어 들다'라는 뜻이에요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 47,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A는 He's tying a cloth apron.이었어요. tie는 '매다, 묶다', apron은 '앞치마'라는 뜻이에요. 일단 사진에서 남자가 앞치마를 하고 있긴 하지만, 지금 앞치마를 묶는 동작을 하고 있는 건 아니죠. 사진에 있는 사물만 보고 선택지를 고르면 안 되고, 핵심 동작까지 확인해야 해요.",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 48,
          "stage": "S6 오답 제거 (B)",
          "tutor": "B의 pouring beans into a coffee machine, 커피 제조기에 원두를 붓는 동작도 사진에 없으니까 바로 X 하면 됩니다.",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 49,
          "stage": "S6 오답 제거 (C)",
          "tutor": "C는 handing a beverage to a customer, 손님에게 음료를 건네고 있다고 했어요. 그런데 사진에 손님이 보이나요?",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "C는 handing a beverage to a customer, 손님에게 음료를 건네고 있다고 했어요. 그런데 사진에 손님이 보이나요?",
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
          "no": 50,
          "stage": "S6 오답 제거 (C)",
          "tutor": "맞아요. customer가 사진에 아예 없죠. 이렇게 사진에 없는 사람이나 사물이 나오면 빠르게 오답으로 지울 수 있어요.",
          "focusQ": 0,
          "reveal": {
            "optionText": [
              {
                "qIdx": 0,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 51,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 표현만 정리할게요. pick up은 집어 들다, pour은 붓다, hand는 건네주다 예요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 52,
          "stage": "S5 정답 근거 연결",
          "tutor": "정답 A를 다시 들어볼게요. Some artwork is hanging on a wall. 재생",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 53,
          "stage": "S5 정답 근거 연결",
          "tutor": "Some artwork, 미술품들이, is hanging, 걸려 있다, on a wall, 벽에라고 했죠. 사진에서 미술품이 벽에 걸려 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "Some artwork, 미술품들이, is hanging, 걸려 있다, on a wall, 벽에라고 했죠. 사진에서 미술품이 벽에 걸려 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "맞아요",
                "correct": true
              },
              {
                "text": "아니에요"
              }
            ]
          }
        },
        {
          "no": 54,
          "stage": "S5 정답 근거 연결",
          "tutor": "그렇죠. hang은 '걸다'라는 뜻이지만, 그림이나 물건이 이미 걸려 있는 상태를 말할 때 be hanging 형태로 표현할 수도 있어요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 55,
          "stage": "S6 오답 제거 (B)",
          "tutor": "B는 Reading materials have been left on a sofa.였어요. 읽을거리는 사진에 있지만 소파 위가 아니라 탁자 위에 있죠. 선택지에 사물은 맞아도 위치가 다르면 오답이에요.",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 56,
          "stage": "S6 오답 제거 (C)",
          "tutor": "C Some windows are being installed. 에서 are being installed는 창문이 지금 설치되고 있는 중이라는 뜻이에요. 사진에서 창문이 설치되고 있나요?",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "C Some windows are being installed. 에서 are being installed는 창문이 지금 설치되고 있는 중이라는 뜻이에요. 사진에서 창문이 설치되고 있나요?",
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
          "no": 57,
          "stage": "S6 오답 제거 (C)",
          "tutor": "맞아요. 창문이 이미 설치되어있는 상태이죠? 이렇게 이미 설치된 상태일 때는 have been installed라고 해야 맞아요. are being installed가 정답이려면 누군가에 의해 창문이 설치되는 장면이 사진에 있어야 해요. 꼭 주의하세요!",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 58,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D는 Some potted plants have fallen on the floor. 화분이 바닥에 떨어져 있다고 했어요. 아니죠? 화분이 있긴 하지만 바닥에 떨어져 있지는 않아서 오답이죠.",
          "focusQ": 1,
          "reveal": {
            "optionText": [
              {
                "qIdx": 1,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 59,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 핵심 정리할게요. is hang on a wall은 벽에 걸려 있는 상태를 나타내고, have been left는 놓여 있는 상태, are being installed는 설치되고 있는 중을 나타내요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 60,
          "stage": "S5 정답 근거 연결",
          "tutor": "사람 두 명이 나오는 사진이죠? 이런 사진은 각 인물의 동작을 잘 봐야 해요. 정답 B를 다시 들어볼게요. One of the women is resting her arm on a glass counter. 재생",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 61,
          "stage": "S5 정답 근거 연결",
          "tutor": "여자들 중 한 명이, is resting her arm, 팔을 기대고 있다, on a glass counter, 유리 진열대에라고 했어요. 사진에서 한 여자가 유리 진열대에 팔을 기대고 있나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "여자들 중 한 명이, is resting her arm, 팔을 기대고 있다, on a glass counter, 유리 진열대에라고 했어요. 사진에서 한 여자가 유리 진열대에 팔을 기대고 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "맞아요",
                "correct": true
              },
              {
                "text": "아니에요"
              }
            ]
          }
        },
        {
          "no": 62,
          "stage": "S5 정답 근거 연결",
          "tutor": "그렇죠. 여러 사람이 등장하는 사진에서는 누가 어떤 동작을 하고 있는지 정확하게 연결해야 해요. 한 여자가 유리 진열대에 팔을 기대고 있으니까 B가 정답입니다.",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 63,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A는 여자 중 한 명이 is reaching into a shopping cart. 쇼핑 카트 안으로 손을 뻗고 있다고 했어요. 사진 속 여자가 손을 뻗고 있기는 하지만 쇼핑 카트 안으로 뻗는 거는 아니죠? 바로 오답으로 X하고 넘어가요.",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 64,
          "stage": "S6 오답 제거 (C)",
          "tutor": "C에는 pushing a button on a cash register가 나왔죠. 사진에 계산대 버튼이 보이나요?",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "C에는 pushing a button on a cash register가 나왔죠. 사진에 계산대 버튼이 보이나요?",
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
          "no": 65,
          "stage": "S6 오답 제거 (C)",
          "tutor": "맞아요. 사진에 없는 button, cash register 같은 핵심 사물이 나오면 빠르게 제거할 수 있어요.",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 66,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D의 opening a display case, 진열장을 열고 있다는 동작도 사진에 없어요. 진열장 근처에 있다고 해서 opening까지 맞는 건 아니니까 동작을 정확히 확인해야 합니다.",
          "focusQ": 2,
          "reveal": {
            "optionText": [
              {
                "qIdx": 2,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 67,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 rest one's arm on ~은 ~에 팔을 기대다, reach into ~는 ~안으로 손을 뻗다, push a button은 버튼을 누르다, open a display case는 진열장을 열다예요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 68,
          "stage": "S5 정답 근거 연결",
          "tutor": "정답 C를 다시 들어볼게요. Some desktops have been divided with partitions. 재생",
          "focusQ": 3,
          "reveal": {
            "optionText": [
              {
                "qIdx": 3,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 69,
          "stage": "S5 정답 근거 연결",
          "tutor": "Some desktops, 일부 책상 상판이, have been divided, 나뉘어 있다, with partitions, 파티션으로라고 했어요. 사진에서 책상 공간들이 파티션으로 나뉘어 있나요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "Some desktops, 일부 책상 상판이, have been divided, 나뉘어 있다, with partitions, 파티션으로라고 했어요. 사진에서 책상 공간들이 파티션으로 나뉘어 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "맞아요",
                "correct": true
              },
              {
                "text": "아니에요"
              }
            ]
          }
        },
        {
          "no": 70,
          "stage": "S5 정답 근거 연결",
          "tutor": "그렇죠. 사진에서 책상 상판이 파티션으로 나뉘어 있는 상태가 그대로 보이니까 C가 정답이에요. 사물 사진에서는 이렇게 사물이 어떤 상태로 배치돼 있는지를 정확하게 들어야 합니다.",
          "focusQ": 3,
          "reveal": {
            "optionText": [
              {
                "qIdx": 3,
                "labels": [
                  "C"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 71,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A는 **Trash bins are being emptied.**였어요. are being emptied는 쓰레기통을 지금 비우고 있는 중이라는 뜻이에요. 사진에서 그런 행동이 진행되고 있나요?",
          "focusQ": 3,
          "reveal": {
            "optionText": [
              {
                "qIdx": 3,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "choice",
            "prompt": "A는 **Trash bins are being emptied.**였어요. are being emptied는 쓰레기통을 지금 비우고 있는 중이라는 뜻이에요. 사진에서 그런 행동이 진행되고 있나요?",
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
          "no": 72,
          "stage": "S6 오답 제거 (A)",
          "tutor": "맞아요. 쓰레기통이 보이더라도 비워지는 행동이 진행 중인 건 아니죠. be being p.p.가 들리면 실제 행동이 진행 중인지 꼭 확인하세요.",
          "focusQ": 3,
          "reveal": {
            "optionText": [
              {
                "qIdx": 3,
                "labels": [
                  "A"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 73,
          "stage": "S6 오답 제거 (B)",
          "tutor": "B의 **Chairs have been positioned along a wall.**은 의자들이 벽을 따라 놓여 있다는 뜻인데, 사진의 의자 위치와 맞지 않으니까 오답입니다.",
          "focusQ": 3,
          "reveal": {
            "optionText": [
              {
                "qIdx": 3,
                "labels": [
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 74,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D는 **There is a stack of documents at each workstation.**이었어요. 그런데 사진에 a stack of documents, 서류 더미가 보이지 않죠. 이런 선택지는 핵심 사물이 없으면 바로 X 하면 돼요.",
          "focusQ": 3,
          "reveal": {
            "optionText": [
              {
                "qIdx": 3,
                "labels": [
                  "D"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 75,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 divide A with B는 A를 B로 나누다, partition은 칸막이, position ~ along a wall은 ~을 벽을 따라 배치하다, a stack of documents는 서류 더미예요.",
          "focusQ": 3,
          "reveal": {
            "optionText": [
              {
                "qIdx": 3,
                "labels": [
                  "A",
                  "B"
                ]
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        }
      ],
    },
  },
}

/** 이 강사·강의 조합의 대본 (없으면 undefined — 평소 레일로 돈다) */
export const scenarioFor = (instructor?: string, code?: string): ScriptedLesson | undefined =>
  (instructor && code && FGI_SCENARIO[instructor]?.[code]) || undefined
