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
}

/** 이 강사·강의 조합의 대본 (없으면 undefined — 평소 레일로 돈다) */
export const scenarioFor = (instructor?: string, code?: string): ScriptedLesson | undefined =>
  (instructor && code && FGI_SCENARIO[instructor]?.[code]) || undefined
