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
import type { Turn, RecapSentence } from '@/data/typeLearning/types'

export interface ScriptedLesson {
  /** 수업(스캐폴딩) 턴 */
  turns: Turn[]
  /** 실전 뒤 코칭 턴 — 비어 있으면 화면이 틀린 문항만 골라 스스로 만든다 */
  review: Turn[]
  /** 도입 화면 — 강사 발화(문단은 줄바꿈으로 나뉜다)와 '오늘 배울 내용'.
   *  없으면 화면이 단계명에서 뽑아 쓴다(S1·S3… 이 그대로 올라와 학생에게는 아무 말도 아니다). */
  intro?: { script: string; points: string[] }
  /** 마지막 정리 화면의 퀴즈 (시트 '핵심요약'). 없으면 강의에 박아 둔 기본 문장을 쓴다.
   *  대본 강의는 **영어 문장 빈칸이 아니라 한국어 전략 퀴즈**다 — 그 강의에서 세운 판단 순서를
   *  되짚는 자리라 그렇다. ko 자리에는 '정답 후 강사 피드백' 이 들어 있다.
   *
   *  **묶음이 여럿일 수 있다.** 이도윤은 전략 정리와 빈출 표현을 둘로 나눠 쓰고, 묶음마다
   *  화면 제목과 강사 도입을 따로 달아 뒀다. 윤다은은 묶음 하나에 제목이 없다. */
  summary?: { title: string; intro: string; items: RecapSentence[] }[]
  /** 실전을 풀고 난 뒤, **틀린 문항이 있을 때만** 코칭 첫 마디로 하는 말 (시트 '실전 문제 풀이 후 멘트').
   *  {전체수}·{맞은수} 자리는 화면이 채점 결과로 채운다. 다 맞히면 코칭 자체가 없어 쓰이지 않는다.
   *  실전 **전** 멘트는 여기 없다 — 유형 학습 마지막 턴('실전 안내')으로 이미 들어가 있다. */
  practiceOutro?: string
}

/** 강사코드 → 강의코드 → 대본. 여기 있는 조합만 대본으로 돈다. */
export const FGI_SCENARIO: Record<string, Record<string, ScriptedLesson>> = {
  yun_daeun: {
    'LC-P1-01': {
      intro: {
        "script": "오늘은 Part 1에서 이 세 가지를 중심으로 연습해 볼게요.\n먼저 Part 1 문제를 어떻게 풀어야 하는지 간단히 살펴보고 시작할게요.\nPart 1은 사진을 보고 네 개의 문장을 들은 다음, 사진을 가장 정확하게 설명하는 문장 하나를 고르는 문제예요.\n그래서 음원을 듣기 전에 사진부터 빠르게 살펴보는 게 중요해요. 사람이 중심인 사진에서는 사람의 동작을, 사물이 중심인 사진에서는 사물의 위치나 상태를 먼저 확인하면 됩니다.\n그리고 사진에 어떤 물건이 보인다고 해서 바로 답을 고르면 안 돼요. 누가 무엇을 하고 있는지, 사물이 어디에 있고 어떤 상태인지까지 선택지와 정확하게 일치하는지 확인해야 해요.\n이제 방금 본 세 가지 포인트를 문제에 적용해 볼게요. 첫 번째 유형부터 시작해 볼까요?",
        "points": [
          "사람이 무엇을 하고 있는지 확인하기",
          "사물이 어디에 있고 어떤 상태인지 확인하기",
          "진행 중인 동작과 이미 되어 있는 상태 구분하기"
        ]
      },
      summary: [
        {
          "title": "Part 1 사람·사물 사진 핵심 정리",
          "intro": "오늘 배운 내용 빠르게 정리해볼게요. 빈칸에 들어갈 말을 직접 적어서 배운 내용을 정리해보세요!",
          "items": [
            {
              "id": "s1_1",
              "en": "사람 중심 사진 → 사람의 ___ 확인",
              "ko": "맞아요. 사람 중심 사진은 사람이 지금 무엇을 하고 있는지부터 확인하는 게 핵심이에요.",
              "answer": "동작",
              "choices": [],
              "keywords": [
                "동작"
              ]
            },
            {
              "id": "s1_2",
              "en": "사물 중심 사진 → 사물의 ___ 확인",
              "ko": "정확해요. 사물이 보이는 것만으로는 부족하고, 어디에 있고 어떤 상태인지까지 확인해야 해요.",
              "answer": "위치와 상태",
              "choices": [],
              "keywords": [
                "위치와 상태"
              ]
            },
            {
              "id": "s1_3",
              "en": "is/are being + p.p. → 동작이 실제로 ___인지 확인",
              "ko": "좋아요. be + being + p.p.가 나오면 사진에서 그 동작이 실제로 진행되고 있는지 꼭 확인해야 해요.",
              "answer": "진행 중",
              "choices": [],
              "keywords": [
                "진행 중"
              ]
            }
          ]
        },
        {
          "title": "핵심 빈출 표현 정리",
          "intro": "마지막으로 오늘 문제에서 나온 토익 빈출 표현만 확인해볼게요. 영어 표현을 보고 알맞은 뜻을 골라보세요.",
          "items": [
            {
              "id": "s2_1",
              "en": "rinse = ___",
              "ko": "수고했어요! Part 1에서 나온 어휘까지 모두 확인했어요. Part 1은 사진 속 사람의 동작, 사물의 위치와 상태를 정확히 표현하는 단어를 아는 게 중요해요. 특히 헷갈렸던 표현은 뜻이 바로 떠오를 수 있도록 한 번 더 복습해두세요.",
              "answer": "헹구다",
              "choices": [
                "헹구다",
                "접다",
                "쌓다"
              ],
              "keywords": [
                "헹구다"
              ]
            },
            {
              "id": "s2_2",
              "en": "line up = ___",
              "ko": "",
              "answer": "줄을 세우다",
              "choices": [
                "흩어놓다",
                "줄을 세우다",
                "들어 올리다"
              ],
              "keywords": [
                "줄을 세우다"
              ]
            },
            {
              "id": "s2_3",
              "en": "fold = ___",
              "ko": "",
              "answer": "접다",
              "choices": [
                "접다",
                "붓다",
                "건네다"
              ],
              "keywords": [
                "접다"
              ]
            },
            {
              "id": "s2_4",
              "en": "stack = ___",
              "ko": "",
              "answer": "쌓다",
              "choices": [
                "펼치다",
                "쌓다",
                "설치하다"
              ],
              "keywords": [
                "쌓다"
              ]
            },
            {
              "id": "s2_5",
              "en": "shovel = ___",
              "ko": "",
              "answer": "삽",
              "choices": [
                "빗자루",
                "갈퀴",
                "삽"
              ],
              "keywords": [
                "삽"
              ]
            },
            {
              "id": "s2_6",
              "en": "prop A against B = ___",
              "ko": "",
              "answer": "A를 B에 기대어 세워두다",
              "choices": [
                "A를 B 안에 넣다",
                "A를 B에 기대어 세워두다",
                "A를 B 위에 쌓다"
              ],
              "keywords": [
                "a를 b에 기대어 세워두다"
              ]
            },
            {
              "id": "s2_7",
              "en": "pour A into B = ___",
              "ko": "",
              "answer": "A를 B 안에 붓다",
              "choices": [
                "A를 B에게 건네다",
                "A를 B 안에 붓다",
                "A를 B에서 꺼내다"
              ],
              "keywords": [
                "a를 b 안에 붓다"
              ]
            },
            {
              "id": "s2_8",
              "en": "hand A to B = ___",
              "ko": "",
              "answer": "A를 B에게 건네다",
              "choices": [
                "A를 B에게 건네다",
                "A를 B 안에 넣다",
                "A를 B 위에 놓다"
              ],
              "keywords": [
                "a를 b에게 건네다"
              ]
            },
            {
              "id": "s2_9",
              "en": "reach into = ___",
              "ko": "",
              "answer": "~안으로 손을 뻗다",
              "choices": [
                "~을 따라 걷다",
                "~에 기대다",
                "~안으로 손을 뻗다"
              ],
              "keywords": [
                "~안으로 손을 뻗다"
              ]
            },
            {
              "id": "s2_10",
              "en": "rest one's arm on = ___",
              "ko": "",
              "answer": "팔을 ~에 기대다",
              "choices": [
                "팔을 들어 올리다",
                "팔을 ~에 기대다",
                "팔을 뒤로 뻗다"
              ],
              "keywords": [
                "팔을 ~에 기대다"
              ]
            }
          ]
        }
      ],
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
          "tutor": "맞아요. 사람이 중심인 사진이니까 사진 속 여자가 지금 무엇을 하고 있는지 한번 말해볼까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "subjective",
            "prompt": "맞아요. 사람이 중심인 사진이니까 사진 속 여자가 지금 무엇을 하고 있는지 한번 말해볼까요?",
            "hint": "그림을 그리고 있어요."
          }
        },
        {
          "no": 3,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "학생 풀이",
          "tutor": "좋습니다. 지금 확인한 '여자가 하고 있는 동작'을 기억하면서 사진을 가장 정확하게 설명하는 문장을 골라볼게요.",
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
          "tutor": "B에 easel이 나왔죠. 그러면 사진에서 여자는 이젤 앞에서 뭘 하고 있죠?",
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
            "prompt": "B에 easel이 나왔죠. 그러면 사진에서 여자는 이젤 앞에서 뭘 하고 있죠?",
            "hint": "그림을 그리고 있어요."
          }
        },
        {
          "no": 6,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결 - B",
          "tutor": "맞아요. 사진에서도 여자가 이젤 앞에서 그림을 그리고 있었죠. B의 The woman is painting a picture on an easel과 정확히 일치하니까 정답은 B예요.",
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
          "stage": "S6 오답 제거 - A",
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
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 8,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - C",
          "tutor": "이제 C를 볼게요. art gallery는 미술관을 뜻해요. C에서는 여자가 art gallery를 방문하고 있다고 했는데, 사진 속 여자는 art gallery를 방문하고 있나요, 아니면 그림을 그리고 있나요?",
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
            "prompt": "이제 C를 볼게요. art gallery는 미술관을 뜻해요. C에서는 여자가 art gallery를 방문하고 있다고 했는데, 사진 속 여자는 art gallery를 방문하고 있나요, 아니면 그림을 그리고 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "visiting an art gallery"
              },
              {
                "text": "painting a picture",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 9,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - D",
          "tutor": "D에서는 여자가 물감 튜브를 손에 들고 있다고 했어요. 사진 속 여자가 실제로 holding a tube of paint 하고 있나요?",
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
            "prompt": "D에서는 여자가 물감 튜브를 손에 들고 있다고 했어요. 사진 속 여자가 실제로 holding a tube of paint 하고 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 10,
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
          "no": 11,
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
          "no": 12,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번 사진도 빠르게 핵심을 잡아볼게요. 이 사진은 사물이 중심인 사진이에요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 13,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "사물이 중심인 사진이니까 사물의 위치나 상태를 봐야 해요. 사진 속 물건들이 어떻게 놓여 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "subjective",
            "prompt": "사물이 중심인 사진이니까 사물의 위치나 상태를 봐야 해요. 사진 속 물건들이 어떻게 놓여 있나요?",
            "hint": "옷들이 옷걸이에 걸려 있어요",
            "accepts": [
              "옷들이 옷걸이에 걸려 있어요",
              "모자가 벽에 걸려 있어요.",
              "신발들이 바닥에 놓여 있어요."
            ]
          }
        },
        {
          "no": 14,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "학생 풀이",
          "tutor": "좋습니다. 방금 확인한 물건들의 상태를 기억하면서 네 개의 문장을 들어보세요.",
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
          "no": 15,
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
          "no": 16,
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
                "text": "O",
                "correct": true
              },
              {
                "text": "X"
              }
            ]
          }
        },
        {
          "no": 17,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결 - A",
          "tutor": "맞아요. 사진 속 일부 신발이 바닥에 줄지어 놓여 있고, A도 Some of the shoes are lined up on the floor.라고 했으니까 정답은 A예요.",
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
          "stage": "S6 오답 제거 - B",
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
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 19,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거- C",
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
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 20,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 are being stored는 '지금 보관되고 있는 중'이라는 뜻이에요. 사진에 모자는 보이지만, 누군가 모자를 보관하는 동작이 진행되고 있나요?",
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
            "prompt": "D의 are being stored는 '지금 보관되고 있는 중'이라는 뜻이에요. 사진에 모자는 보이지만, 누군가 모자를 보관하는 동작이 진행되고 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 21,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S7 표현 정리",
          "tutor": "좋아요. 사람이 중심이 아닌 사진에서는 사물의 무엇을 확인해야 하죠?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "좋아요. 사람이 중심이 아닌 사진에서는 사물의 무엇을 확인해야 하죠?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "위치와 상태",
                "correct": true
              },
              {
                "text": "개수"
              }
            ]
          }
        },
        {
          "no": 22,
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
          "no": 23,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번 사진도 사물이 중심인 사진이에요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 24,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "그럼 사진에서 보이는 사물과 그 사물들이 어떻게 놓여 있는지 묘사해볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "subjective",
            "prompt": "그럼 사진에서 보이는 사물과 그 사물들이 어떻게 놓여 있는지 묘사해볼까요?",
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
          "no": 25,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "학생 풀이",
          "tutor": "좋습니다. 화분의 위치와 상태를 생각하면서 사진을 가장 정확하게 설명하는 문장을 골라볼게요.",
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
          "no": 26,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "이번 문제에서는 수동태의 '진행 중인 동작'과 '이미 되어 있는 상태'를 구분하는 게 중요해요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 27,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "A의 are being watered는 식물들이 지금 누군가에게 물을 받고 있는 중, 즉 누군가 식물에 물을 주는 동작이 진행 중이라는 뜻이에요. 반면 D의 have been lined up은 화분들이 이미 줄지어 놓인 결과 상태를 말해요. 사진에서는 식물에 물을 주는 동작이 보이나요, 아니면 화분들이 줄지어 놓여 있나요?",
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
            "prompt": "A의 are being watered는 식물들이 지금 누군가에게 물을 받고 있는 중, 즉 누군가 식물에 물을 주는 동작이 진행 중이라는 뜻이에요. 반면 D의 have been lined up은 화분들이 이미 줄지어 놓인 결과 상태를 말해요. 사진에서는 식물에 물을 주는 동작이 보이나요, 아니면 화분들이 줄지어 놓여 있나요?",
            "hint": "이미 줄지어 놓여 있어요."
          }
        },
        {
          "no": 28,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결 - D",
          "tutor": "맞아요. 사진에서는 물을 주는 동작이 진행 중인 게 아니라 화분들이 선반에 이미 줄지어 놓여 있죠. 그래서 Some pots have been lined up on a shelf가 정답이에요.",
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
          "no": 29,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - B",
          "tutor": "B도 표현 하나 볼게요. shovel은 삽, shed는 작은 창고예요. 그리고 prop A against B는 A를 B에 기대어 세워두다라는 뜻이에요. 그래서 이 문장은 '삽이 창고에 기대어 세워져 있다'는 뜻이에요. 사진에 shovel이 보이나요?",
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
            "prompt": "B도 표현 하나 볼게요. shovel은 삽, shed는 작은 창고예요. 그리고 prop A against B는 A를 B에 기대어 세워두다라는 뜻이에요. 그래서 이 문장은 '삽이 창고에 기대어 세워져 있다'는 뜻이에요. 사진에 shovel이 보이나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 30,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - C",
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
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 31,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S7 표현 정리",
          "tutor": "좋아요. is/are being p.p.가 들리면 사진에서 실제로 그 동작이 진행 중인지 확인해야 해요. 반대로 have been lined up처럼 행동이 이미 이루어진 표현은 보이는 결과 상태와 맞는지를 확인하면 돼요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 32,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "마무리 멘트",
          "tutor": "좋아요, 잘했어요! 이제 진행 중인 동작과 이미 되어 있는 상태를 구분해서 들을 수 있겠죠? 다음으로 넘어갈게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 65,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "실전 안내",
          "tutor": "배운 부분을 떠올리며 문제를 먼저 풀어보세요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        }
      ],
      review: [
        {
          "no": 33,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이 문제는 사진부터 다시 한번 볼게요. 사진 속 사람의 행동을 묘사해볼까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "subjective",
            "prompt": "이 문제는 사진부터 다시 한번 볼게요. 사진 속 사람의 행동을 묘사해볼까요?",
            "hint": "- 남자가 있고 컵과 커피 머신이 보여요. - 남자가 컵을 집어 들고 있어요."
          }
        },
        {
          "no": 34,
          "stage": "S6 오답 제거 - A",
          "tutor": "좋아요. 그럼 A부터 하나씩 확인해볼게요. tie an apron은 '앞치마를 매다'라는 뜻이에요. 사진 속 남자가 지금 앞치마를 매는 중인가요?'",
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
            "prompt": "좋아요. 그럼 A부터 하나씩 확인해볼게요. tie an apron은 '앞치마를 매다'라는 뜻이에요. 사진 속 남자가 지금 앞치마를 매는 중인가요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 35,
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
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 36,
          "stage": "S3 개념 코칭",
          "tutor": "여기서 하나 기억할게요. 사진에 앞치마나 커피 머신이 실제로 보여도, 문장에서 말하는 동작까지 같아야 정답이 될 수 있어요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 37,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 hand A to B는 'A를 B에게 건네다'는 뜻이에요. 따라서 이 문장은 손님에게 음료를 건네고 있다는 뜻이에요. 사진 속 남자가 handing a beverage to a customer 하고 있나요?",
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
            "prompt": "C의 hand A to B는 'A를 B에게 건네다'는 뜻이에요. 따라서 이 문장은 손님에게 음료를 건네고 있다는 뜻이에요. 사진 속 남자가 handing a beverage to a customer 하고 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 38,
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
                "text": "O",
                "correct": true
              },
              {
                "text": "X"
              }
            ]
          }
        },
        {
          "no": 39,
          "stage": "S5 정답 근거 연결 - D",
          "tutor": "맞아요. 남자가 빈 컵을 집어 들고 있으니까 He's picking up an empty cup이 사진과 정확히 일치해요. 그래서 정답은 D예요.",
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
          "no": 40,
          "stage": "S7 표현 정리",
          "tutor": "표현만 정리하고 갈게요. tie an apron은 '앞치마를 매다', pour A into B는 'A를 B 안에 붓다', hand A to B는 'A를 B에게 건네다', pick up은 '집어 들다'예요. 꼭 기억하세요!",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 41,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번 사진은 사물이 여러 개 보이네요. 사진에 무엇이 있고, 각각 어디에 놓여 있는지 묘사해볼까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "subjective",
            "prompt": "이번 사진은 사물이 여러 개 보이네요. 사진에 무엇이 있고, 각각 어디에 놓여 있는지 묘사해볼까요?",
            "hint": "- 소파와 테이블이 있고 벽에 그림이 걸려 있어요. - 테이블 위에는 책이나 잡지가 있고 화분도 보여요."
          }
        },
        {
          "no": 42,
          "stage": "S5 정답 근거 연결 - A",
          "tutor": "A부터 볼게요. artwork는 그림이나 작품 같은 미술품이고, hang on a wall은 '벽에 걸려 있다'라는 뜻이에요. 사진과 일치하나요?",
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
            "prompt": "A부터 볼게요. artwork는 그림이나 작품 같은 미술품이고, hang on a wall은 '벽에 걸려 있다'라는 뜻이에요. 사진과 일치하나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O",
                "correct": true
              },
              {
                "text": "X"
              }
            ]
          }
        },
        {
          "no": 43,
          "stage": "S6 오답 제거 - B",
          "tutor": "A는 사진과 일치하네요. 정답이라고 확정하기 전에 나머지 보기들도 끝까지 확인해볼게요. B의 reading materials는 책이나 잡지 같은 읽을거리예요. 사진에서는 reading materials가 소파 위에 있나요, 테이블 위에 있나요?",
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
            "prompt": "A는 사진과 일치하네요. 정답이라고 확정하기 전에 나머지 보기들도 끝까지 확인해볼게요. B의 reading materials는 책이나 잡지 같은 읽을거리예요. 사진에서는 reading materials가 소파 위에 있나요, 테이블 위에 있나요?",
            "hint": "테이블 위에 있어요."
          }
        },
        {
          "no": 44,
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
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 45,
          "stage": "S3 개념 코칭",
          "tutor": "맞아요. 특히 is/are being p.p.가 나오면 그 사물이 사진에 있는지만 보는 게 아니라, 실제로 그 동작이 진행 중인지 확인해야 해요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 46,
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
          "no": 47,
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
          "no": 48,
          "stage": "S7 표현 정리",
          "tutor": "이 문제에서는 사물의 존재뿐 아니라 위치와 상태까지 정확히 비교하는 것이 중요했어요. artwork는 '미술품', reading materials는 '읽을거리', be installed는 '설치되다'로 기억해둘게요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 49,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번 사진도 먼저 전체를 볼게요. 사진 속 두 사람이 취하고 있는 행동이나 자세를 묘사해볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "subjective",
            "prompt": "이번 사진도 먼저 전체를 볼게요. 사진 속 두 사람이 취하고 있는 행동이나 자세를 묘사해볼까요?",
            "hint": "- 여자 두 명이 있고 유리 진열대와 쇼핑 카트가 보여요. - 한 여자는 진열대 쪽에 팔을 올리고 있어요."
          }
        },
        {
          "no": 50,
          "stage": "S6 오답 제거 - A",
          "tutor": "좋아요. A의 reach into는 '~안으로 손을 뻗다'라는 뜻이에요. 한 여성이 실제로 쇼핑 카트 안으로 reach into 하고 있나요?",
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
            "prompt": "좋아요. A의 reach into는 '~안으로 손을 뻗다'라는 뜻이에요. 한 여성이 실제로 쇼핑 카트 안으로 reach into 하고 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 51,
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
                "text": "O",
                "correct": true
              },
              {
                "text": "X"
              }
            ]
          }
        },
        {
          "no": 52,
          "stage": "S3 개념 코칭",
          "tutor": "좋아요. rest를 무조건 '쉬다'로만 보면 안 돼요. 'rest + 신체 부위 + on~' 처럼 쓰이면 '신체 부위를 ~에 기대거나 올려두다'라는 의미로 쓰여요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 53,
          "stage": "S6 오답 제거 - C",
          "tutor": "C에서는 여성이 계산대의 버튼을 누르고 있다고 했어요. 오른쪽 여성은 계산대 버튼을 누르고 있나요? 아니면 진열장에서 무언가를 집고 있는 것 같아 보이나요?",
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
            "prompt": "아니면 진열장에서 무언가를 집고 있는 것 같아 보이나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "계산대 버튼을 누르고 있음"
              },
              {
                "text": "무언가 집고 있음",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 54,
          "stage": "S6 오답 제거 - D",
          "tutor": "마지막 D의 display case는 상품을 넣어 보여주는 진열장이에요. 여성이 display case를 열고 있는 모습인가요?",
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
            "prompt": "마지막 D의 display case는 상품을 넣어 보여주는 진열장이에요. 여성이 display case를 열고 있는 모습인가요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 55,
          "stage": "S5 정답 확정",
          "tutor": "맞아요. 여성이 진열장을 열고 있지는 않죠. A, C, D에서 말한 동작은 실제로 하지 않고 있고, B에서 말한 자세만 사진과 일치해요. 그래서 정답은 B예요.",
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
          "no": 56,
          "stage": "S7 표현 정리",
          "tutor": "reach into ~는 '~안으로 손을 뻗다', rest one's arm on ~은 '팔을 ~에 기대다', display case는 '진열장'이에요. 사람이 여러 명 나오면 각 사람의 행동과 자세를 각각 확인해보세요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 57,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이 사진도 전체부터 살펴볼게요. 사진에 보이는 사물들이 어떻게 배치되어 있는지를 중심으로 묘사해볼까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "subjective",
            "prompt": "이 사진도 전체부터 살펴볼게요. 사진에 보이는 사물들이 어떻게 배치되어 있는지를 중심으로 묘사해볼까요?",
            "hint": "- 책상과 의자가 여러 개 있고 책상 사이에 칸막이가 있어요. - 쓰레기통도 있고 사무실처럼 보여요."
          }
        },
        {
          "no": 58,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 Trash bins are being emptied는 '쓰레기통들이 지금 비워지고 있는 중이다'라는 뜻이에요. 사진에는 쓰레기통이 있지만 실제로 비워지고 있나요?",
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
            "prompt": "A의 Trash bins are being emptied는 '쓰레기통들이 지금 비워지고 있는 중이다'라는 뜻이에요. 사진에는 쓰레기통이 있지만 실제로 비워지고 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 59,
          "stage": "S3 개념 코칭",
          "tutor": "그렇죠. 사물이 존재하는 것과 그 사물에 관한 동작이 실제로 진행되는 것은 달라요. 특히 is/are being p.p.는 사진에서 그 동작이 진행 중인지 꼭 확인해야 해요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 60,
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
          "no": 61,
          "stage": "S5 정답 근거 연결 - C",
          "tutor": "C의 partition은 '칸막이'이고, be divided with ~는 '~로 나뉘어 있다'라는 뜻이에요. 사진에서도 책상 공간이 partition으로 divide 되어 있나요?",
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
            "prompt": "C의 partition은 '칸막이'이고, be divided with ~는 '~로 나뉘어 있다'라는 뜻이에요. 사진에서도 책상 공간이 partition으로 divide 되어 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O",
                "correct": true
              },
              {
                "text": "X"
              }
            ]
          }
        },
        {
          "no": 62,
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
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 63,
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
          "no": 64,
          "stage": "S7 표현 정리",
          "tutor": "이 문제에서 쓰인 be being emptied는 '지금 비워지고 있는 중', along a wall은 '벽을 따라서', partition은 '칸막이', a stack of documents는 '서류 한 더미'라는 뜻이에요. 같이 기억해둘게요!",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        }
      ],
    },
    'RC-P5-08': {
      intro: {
        "script": "이번에는 Part 5에서 능동태와 수동태를 빠르게 구분하는 방법을 연습해 볼게요.\nPart 5는 보기를 하나씩 해석하기보다, 빈칸 앞뒤의 문장 구조를 먼저 보는 것이 중요해요.\n먼저 빈칸이 동사 자리인지 확인하고, 주어가 직접 행동하는지 아니면 행동을 받는지를 살펴볼 거예요.\n여기에 빈칸 뒤에 목적어가 있는지, by + 행위자 같은 표현이 있는지도 같이 확인하면 능동태와 수동태를 훨씬 쉽게 구분할 수 있어요.\n그리고 능동·수동만 맞는다고 끝나는 건 아니에요. 시제나 주어의 수까지 확인해서 보기의 형태를 하나씩 줄이고, 마지막에는 문장 뜻까지 자연스러운지 확인할게요.\n그럼 첫 번째 유형부터 시작해 볼까요?",
        "points": [
          "주어가 동작을 하는지·받는지 보고 능동태와 수동태 구분하기",
          "목적어·시제·by 표현을 확인해 알맞은 동사 형태 고르기"
        ]
      },
      summary: [
        {
          "title": "Part 5 능동태·수동태 핵심 정리",
          "intro": "오늘 배운 내용 빠르게 정리해볼게요. 빈칸에 들어갈 말을 직접 적어서 배운 내용을 정리해보세요!",
          "items": [
            {
              "id": "s1_1",
              "en": "능동·수동 판단 → 주어가 동작을 하는지, 또는 ___ 확인",
              "ko": "맞아요. 주어가 직접 행동하면 능동태, 행동을 받으면 수동태예요. 먼저 주어와 동사의 관계부터 보는 게 중요해요.",
              "answer": "받는지",
              "choices": [],
              "keywords": [
                "받는지"
              ]
            },
            {
              "id": "s1_2",
              "en": "동사 뒤에 목적어가 바로 이어짐 → 먼저 ___ 가능성 확인",
              "ko": "정확해요. 동사 뒤에 목적어가 바로 나오면 주어가 직접 행동하는 능동 구조인지 먼저 확인해볼 수 있어요.",
              "answer": "능동태",
              "choices": [],
              "keywords": [
                "능동태"
              ]
            },
            {
              "id": "s1_3",
              "en": "능동·수동 판단 후 → ___까지 확인해 동사 형태 결정",
              "ko": "좋아요. 능동·수동을 정했다고 끝이 아니에요. yesterday 같은 시제 단서와 주어의 단수·복수까지 확인해야 정확한 동사 형태를 고를 수 있어요.",
              "answer": "시제와 주어의 수",
              "choices": [],
              "keywords": [
                "시제와 주어의 수"
              ]
            }
          ]
        },
        {
          "title": "핵심 빈출 표현 정리",
          "intro": "마지막으로 오늘 문제에서 나온 토익 빈출 표현만 확인해볼게요. 영어 표현을 보고 알맞은 뜻을 골라보세요.",
          "items": [
            {
              "id": "s2_1",
              "en": "standardize = ___",
              "ko": "수고했어요! 오늘 나온 어휘까지 모두 확인했어요. 문제를 풀 때는 문법만 보는 게 아니라 동사의 뜻을 정확히 아는 것도 정말 중요해요. 특히 헷갈렸던 단어는 그냥 넘어가지 말고, 뜻이 바로 떠오를 때까지 꼭 반복해서 외워주세요.",
              "answer": "표준화하다",
              "choices": [
                "단순화하다",
                "표준화하다",
                "분류하다"
              ],
              "keywords": [
                "표준화하다"
              ]
            },
            {
              "id": "s2_2",
              "en": "replacement = ___",
              "ko": "",
              "answer": "교체",
              "choices": [
                "보상",
                "충전",
                "교체"
              ],
              "keywords": [
                "교체"
              ]
            },
            {
              "id": "s2_3",
              "en": "direct A to do = ___",
              "ko": "",
              "answer": "A에게 ~하도록 지시하다",
              "choices": [
                "A가 ~하도록 허락하다",
                "A와 함께 일하다",
                "A에게 ~하도록 지시하다"
              ],
              "keywords": [
                "a에게 ~하도록 지시하다"
              ]
            },
            {
              "id": "s2_4",
              "en": "take over = ___",
              "ko": "",
              "answer": "맡다",
              "choices": [
                "전달하다",
                "맡다",
                "중단하다"
              ],
              "keywords": [
                "맡다"
              ]
            },
            {
              "id": "s2_5",
              "en": "input = ___",
              "ko": "",
              "answer": "의견, 조언",
              "choices": [
                "의견, 조언",
                "결과",
                "책임"
              ],
              "keywords": [
                "의견, 조언"
              ]
            },
            {
              "id": "s2_6",
              "en": "waive = ___",
              "ko": "",
              "answer": "면제하다",
              "choices": [
                "연기하다",
                "면제하다",
                "요구하다"
              ],
              "keywords": [
                "면제하다"
              ]
            },
            {
              "id": "s2_7",
              "en": "appoint A as B = ___",
              "ko": "",
              "answer": "A를 B로 임명하다",
              "choices": [
                "A를 B로 임명하다",
                "A를 B에게 소개하다",
                "A를 B로 교체하다"
              ],
              "keywords": [
                "a를 b로 임명하다"
              ]
            },
            {
              "id": "s2_8",
              "en": "assemble = ___",
              "ko": "",
              "answer": "조립하다",
              "choices": [
                "검사하다",
                "운반하다",
                "조립하다"
              ],
              "keywords": [
                "조립하다"
              ]
            },
            {
              "id": "s2_9",
              "en": "assume duties = ___",
              "ko": "",
              "answer": "업무를 맡다",
              "choices": [
                "업무를 분담하다",
                "업무를 중단하다",
                "업무를 맡다"
              ],
              "keywords": [
                "업무를 맡다"
              ]
            },
            {
              "id": "s2_10",
              "en": "construct = ___",
              "ko": "",
              "answer": "건설하다",
              "choices": [
                "건설하다",
                "철거하다",
                "수리하다"
              ],
              "keywords": [
                "건설하다"
              ]
            }
          ]
        }
      ],
      turns: [
        {
          "no": 1,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S2 유형·역할 판별",
          "tutor": "먼저 빈칸 바로 앞을 볼게요. 빈칸과 함께 동사 표현을 만드는 be동사가 하나 있어요. 그 단어를 찾아 동그라미 쳐볼까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "mark",
            "prompt": "먼저 빈칸 바로 앞을 볼게요. 빈칸과 함께 동사 표현을 만드는 be동사가 하나 있어요. 그 단어를 찾아 동그라미 쳐볼까요?",
            "targetWords": [
              "are"
            ]
          }
        },
        {
          "no": 2,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭",
          "tutor": "잘 찾았어요. 빈칸 바로 앞에 are이 있으니까 빈칸은 are과 함께 동사를 완성하는 자리예요. 주어가 직접 행동하면 능동태, 행동을 받으면 수동태를 쓰고, 수동태의 기본 형태는 be동사 + p.p예요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 3,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S4 구조·흐름 파악",
          "tutor": "standardize는 '표준화하다'라는 뜻인데 이 문장에서 무엇이 표준화되는지 볼게요. of 뒤의 꾸며주는 부분은 잠깐 빼고, 주어의 핵심 부분만 찾아 동그라미 쳐볼까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "mark",
            "prompt": "standardize는 '표준화하다'라는 뜻인데 이 문장에서 무엇이 표준화되는지 볼게요. of 뒤의 꾸며주는 부분은 잠깐 빼고, 주어의 핵심 부분만 찾아 동그라미 쳐볼까요?",
            "targetWords": [
              "All component parts"
            ]
          }
        },
        {
          "no": 4,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S4 구조·흐름 파악",
          "tutor": "좋아요. 주어는 All component parts예요. 이 부품들이 무언가를 표준화하는 쪽일까요, 아니면 표준화되는 대상일까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "좋아요. 주어는 All component parts예요. 이 부품들이 무언가를 표준화하는 쪽일까요, 아니면 표준화되는 대상일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "표준화하는 쪽"
              },
              {
                "text": "표준화되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 5,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거",
          "tutor": "(A) standardizing을 넣으면 are standardizing, '표준화하고 있다'라는 능동 진행형이 되고, (C) standardizes는 3인칭 단수 현재형이라 이미 있는 are과 함께 쓸 수 없어요. (D) standardization은 명사라서 are 뒤에 형태상 올 수는 있지만, '모든 구성품은 표준화이다'라는 의미가 되어 어색해요. 그럼 수동태를 완성할 수 있는 보기는 무엇일까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 0
          }
        },
        {
          "no": 6,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "B를 넣으면 are standardized, '부품들이 표준화되어 있다'라는 뜻이 돼요. 문장 전체를 해석하면 'Lowry 자동문의 모든 구성품은 간편한 교체를 위해 표준화되어 있다.'가 됩니다. 문장의 의미도 자연스럽죠?",
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
          "stage": "S7 표현 정리",
          "tutor": "이 문제에서는 are만 보고 형태를 고르는 게 아니라, 주어인 부품들이 '표준화되는 대상'이라는 점까지 확인하는 게 핵심이에요. 수동태는 'be동사 + p.p'임을 잊지 마세요! standardize는 '표준화하다', replacement는 '교체'라는 뜻이니 기억해두세요!",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 8,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "마무리 멘트",
          "tutor": "다음 유형으로 넘어갈게요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 9,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S2 유형·역할 판별",
          "tutor": "이번에는 빈칸 앞을 볼게요. '~할 수 없다'는 뜻을 만드는 조동사가 하나 있어요. 그 단어를 찾아 동그라미 쳐볼까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "mark",
            "prompt": "이번에는 빈칸 앞을 볼게요. '~할 수 없다'는 뜻을 만드는 조동사가 하나 있어요. 그 단어를 찾아 동그라미 쳐볼까요?",
            "targetWords": [
              "cannot"
            ]
          }
        },
        {
          "no": 10,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "맞아요. cannot은 조동사라서 뒤에는 동사원형이 와야 해요. 그런데 주어가 행동을 받는 수동태라면 조동사 + be + p.p. 형태를 만들어야 합니다.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 11,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S4 구조·흐름 파악",
          "tutor": "'어떤 사용자에 의해'라는 뜻에 해당하는 표현을 찾아 밑줄 쳐볼까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "mark",
            "prompt": "'어떤 사용자에 의해'라는 뜻에 해당하는 표현을 찾아 밑줄 쳐볼까요?",
            "targetWords": [
              "by any user"
            ]
          }
        },
        {
          "no": 12,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거",
          "tutor": "잘 찾았어요. settings가 any user에 의해 변경되는 구조니까 수동태가 필요해요. (A) to alter와 (C) altering은 조동사 뒤에 들어갈 형태로 적절하지 않고, (B) alter와 (D) be altered 중 수동태를 만드는 보기는 어느 쪽인가요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "잘 찾았어요. settings가 any user에 의해 변경되는 구조니까 수동태가 필요해요. (A) to alter와 (C) altering은 조동사 뒤에 들어갈 형태로 적절하지 않고, (B) alter와 (D) be altered 중 수동태를 만드는 보기는 어느 쪽인가요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "(B) alter"
              },
              {
                "text": "(D) be altered",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 13,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. cannot be altered는 '변경될 수 없다'라는 뜻이에요. 설정이 변경되는 대상이니까 수동태가 자연스럽죠. (B) alter은 동사원형이라 형태상으로는 가능하지만 '설정이 무언가를 변경할 수 없다'는 능동의 의미가 되니 적절하지 않아요. 정답을 넣어 문장 전체를 해석하면 '버즈 가상 회의실의 설정은 10자리 제어 코드 없이는 어떤 사용자에 의해서도 변경될 수 없다.'가 됩니다.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 14,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S7 표현 정리",
          "tutor": "이 문제는 조동사를 보면서 먼저 동사원형 자리를 확인하고, 주어가 행동을 받으면 be를 넣어 수동태를 만든다는 게 핵심이에요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 15,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "마무리 멘트",
          "tutor": "다음 유형으로 넘어갈게요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 16,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 바로 뒤를 볼게요. Ms. Levy가 지시하는 대상을 나타내는 표현을 찾아 동그라미 쳐볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "mark",
            "prompt": "빈칸 바로 뒤를 볼게요. Ms. Levy가 지시하는 대상을 나타내는 표현을 찾아 동그라미 쳐볼까요?",
            "targetWords": [
              "team"
            ]
          }
        },
        {
          "no": 17,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "잘 찾았어요. the team이 동사의 목적어로 바로 이어지고 있죠. 이렇게 동사 뒤에 목적어가 있으면, 주어가 직접 행동하는 능동태인지 먼저 확인해 볼 수 있어요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 18,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그럼 Ms. Levy는 the team에게 지시하는 사람일까요, 지시를 받는 사람일까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "그럼 Ms. Levy는 the team에게 지시하는 사람일까요, 지시를 받는 사람일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "지시하는 사람",
                "correct": true
              },
              {
                "text": "지시받는 사람"
              }
            ]
          }
        },
        {
          "no": 19,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "좋아요. 이번에는 앞의 when절에서 과거를 나타내는 동사를 하나 찾아 밑줄 쳐볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "mark",
            "prompt": "좋아요. 이번에는 앞의 when절에서 과거를 나타내는 동사를 하나 찾아 밑줄 쳐볼까요?",
            "targetWords": [
              "took"
            ]
          }
        },
        {
          "no": 20,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거",
          "tutor": "맞아요. '업무를 맡다'라는 뜻의 took over이 과거이므로 빈칸도 과거가 자연스러워요. (B) direct와 (C) is directing은 시제가 맞지 않고, (D) was directed는 수동태인데, Ms. Levy는 지시를 받는 대상이 아니라 the team에게 지시하는 주체라고 했으니 수동태는 맞지 않죠. 정답은 무엇일까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 2
          }
        },
        {
          "no": 21,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "A를 넣으면 Ms. Levy directed the team to provide..., '레비 씨가 팀에게 ~하도록 지시했다'가 돼요. 구조와 의미가 모두 맞아요. 문장 전체를 해석하면 '프로젝트를 맡았을 때, 레비 씨는 팀에게 다음 한 달 동안 진행 상황 보고를 자주 하라고 지시했다.'가 됩니다.",
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
          "no": 22,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S7 표현 정리",
          "tutor": "이 문제는 빈칸 뒤 목적어 the team을 먼저 확인해 능동태로 좁히고, took over로 과거 시제까지 확인한 것이 핵심이에요. direct A to부정사는 'A에게 ~하도록 지시하다', take over는 '맡다·인수하다', progress update는 '진행 상황 보고'예요. 표현도 기억해 주세요!",
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
          "no": 23,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "마무리 멘트",
          "tutor": "좋아요! 마지막 유형으로 넘어갈게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 24,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S2 유형·역할 판별",
          "tutor": "먼저 빈칸 앞을 볼게요. of 뒤의 설명은 잠깐 빼고, 주어의 핵심 부분만 찾아 동그라미 쳐볼까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "mark",
            "prompt": "먼저 빈칸 앞을 볼게요. of 뒤의 설명은 잠깐 빼고, 주어의 핵심 부분만 찾아 동그라미 쳐볼까요?",
            "targetWords": [
              "layout"
            ]
          }
        },
        {
          "no": 25,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S3 개념 코칭",
          "tutor": "맞아요. 주어는 The layout이에요. 수동태는 주어가 직접 행동하는 게 아니라 행동을 받는 경우에 사용해요. 그리고 행동을 받고 있는 상황이 진행 중일 때는 진행 수동태인 be being p.p. 형태를 사용할 수 있어요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 26,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그럼 layout이 직접 무언가를 설계하는 걸까요, 누군가에 의해 설계되는 대상일까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "그럼 layout이 직접 무언가를 설계하는 걸까요, 누군가에 의해 설계되는 대상일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "직접 설계함"
              },
              {
                "text": "설계되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 27,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S4 구조·흐름 파악",
          "tutor": "좋아요. 그러면 이 문장에는 능동태와 수동태 중 어떤 형태가 필요하죠?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "좋아요. 그러면 이 문장에는 능동태와 수동태 중 어떤 형태가 필요하죠?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "능동태"
              },
              {
                "text": "수동태",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 28,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 오답 제거",
          "tutor": "맞아요. 이제 보기를 볼게요. (A) designs는 '직접 설계한다'는 현재 능동형이고, (B) was designing도 '설계하고 있었다'라는 능동 진행형이라 주어와 맞지 않아요. (D) designed는 과거형이나 과거분사로 쓸 수 있지만, 수동태를 만들려면 앞에 be동사가 필요해요. (C) is being designed는 be being p.p.로 진행 수동태예요. 주어가 설계되는 대상이라는 의미를 만족하는 보기는 무엇일까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 3
          }
        },
        {
          "no": 29,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. The layout is being designed는 '배치가 현재 설계되고 있다'라는 뜻이에요. 문장 전체를 해석하면 '피어스 대학교 새 기숙사의 배치는 학생들의 의견을 반영하여 설계되고 있다.'가 됩니다.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 30,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S7 표현 정리",
          "tutor": "이 문제에서는 먼저 주어 layout이 직접 설계하는지 설계되는 대상인지 판단하는 것이 핵심이에요. 진행 수동태는 be being p.p., layout은 '배치·설계', input은 여기서 '의견이나 조언'이라는 뜻이니 기억하세요!",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 31,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "마무리 멘트",
          "tutor": "잘했어요! 이제 실전 문제로 넘어갈게요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 68,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "실전 안내",
          "tutor": "배운 부분을 떠올리며 문제를 먼저 풀어보세요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        }
      ],
      review: [
        {
          "no": 32,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 바로 앞을 볼게요. 빈칸 바로 앞에서 미래를 나타내는 표현과 함께 이어지는 동사 표현 전체를 찾아 동그라미 쳐볼까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "mark",
            "prompt": "빈칸 바로 앞을 볼게요. 빈칸 바로 앞에서 미래를 나타내는 표현과 함께 이어지는 동사 표현 전체를 찾아 동그라미 쳐볼까요?",
            "targetWords": [
              "will be"
            ]
          }
        },
        {
          "no": 33,
          "stage": "S3 개념 코칭",
          "tutor": "맞아요. will be가 있으니까 미래 시제이고, 주어가 행동을 받는다면 will be p.p. 형태의 미래 수동태를 만들어야 해요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 34,
          "stage": "S4 구조·흐름 파악",
          "tutor": "이 문장에서 entry fee는 '입장료', 보기의 waive는 '면제하다'라는 뜻의 동사예요. 그럼 entry fee는 누군가를 면제하는 쪽일까요, 면제되는 대상일까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "이 문장에서 entry fee는 '입장료', 보기의 waive는 '면제하다'라는 뜻의 동사예요. 그럼 entry fee는 누군가를 면제하는 쪽일까요, 면제되는 대상일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "면제하는 쪽"
              },
              {
                "text": "면제되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 35,
          "stage": "S6 오답 제거",
          "tutor": "입장료는 누군가를 면제하는 게 아니라 면제되는 대상이죠. 그래서 will be 뒤에는 수동태를 완성하는 과거분사 p.p.가 필요해요. (A) waives는 3인칭 단수 현재형이라 will be 뒤에 올 수 없고, (B) waiving은 ing형이라 넣으면 수동태가 완성되지 않아요. (D) waivers는 '면제'라는 뜻의 명사라 여기서 필요한 과거분사 자리에 올 수 없어요. 그러면 will be p.p. 형태를 완성하는 보기는 무엇일까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 0
          }
        },
        {
          "no": 36,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. the entry fee will be waived는 '입장료가 면제될 것이다'라는 뜻이라 문맥에도 잘 맞아요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 37,
          "stage": "S7 표현 정리",
          "tutor": "이 문제는 will be를 보고 미래 수동태 자리를 빠르게 잡은 뒤, entry fee가 '면제되는 대상'인지 의미까지 확인하는 게 핵심이에요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 38,
          "stage": "S2 유형·역할 판별",
          "tutor": "먼저 빈칸 뒤를 볼게요. as the editor-in-chief 앞에 임명되는 대상이 따로 나와 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "먼저 빈칸 뒤를 볼게요. as the editor-in-chief 앞에 임명되는 대상이 따로 나와 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 39,
          "stage": "S3 개념 코칭",
          "tutor": "appoint A as B는 'A를 B로 임명하다'라는 표현이에요. 반대로 A가 주어로 나오면 A be appointed as B, 즉 'A가 B로 임명되다'라는 수동태 형태를 사용해요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 40,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그럼 이 문장에서 Romesh Sastry는 누군가를 편집장으로 임명하는 사람일까요, 아니면 편집장으로 임명되는 사람일까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "그럼 이 문장에서 Romesh Sastry는 누군가를 편집장으로 임명하는 사람일까요, 아니면 편집장으로 임명되는 사람일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "임명하는 사람"
              },
              {
                "text": "임명되는 사람",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 41,
          "stage": "S4 구조·흐름 파악",
          "tutor": "좋아요. 그러면 수동태가 필요하겠네요. 이번에는 이 일이 언제 일어났는지 알려주는 표현을 찾아 밑줄 쳐볼까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "mark",
            "prompt": "좋아요. 그러면 수동태가 필요하겠네요. 이번에는 이 일이 언제 일어났는지 알려주는 표현을 찾아 밑줄 쳐볼까요?",
            "targetWords": [
              "yesterday"
            ]
          }
        },
        {
          "no": 42,
          "stage": "S4 추가 설명",
          "tutor": "잘 찾았어요. yesterday가 있으니까 시제는 과거로 가야 해요. 결국 이 문장에는 과거 + 수동태라는 두 조건이 필요합니다.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 43,
          "stage": "S6 오답 제거",
          "tutor": "이제 보기를 볼게요. (B) appoints는 현재 능동형이고, (C) is appointing도 현재 진행 능동형이라 수동태가 아니에요. (D) appointed는 과거 능동형이고 수동태로 쓰려면 앞에 be동사가 필요해요. 그럼 과거이면서 수동태인 보기는 무엇일까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 1
          }
        },
        {
          "no": 44,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. was appointed as the editor-in-chief는 '편집장으로 임명되었다'라는 뜻이에요. 문장 전체는 'Romesh Sastry가 어제 Garrison Herald 신문의 편집장으로 임명되었다'가 되니까 구조와 의미가 모두 자연스럽습니다.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 45,
          "stage": "S7 표현 정리",
          "tutor": "이 문제에서는 appoint A as B는 'A를 B로 임명하다'이고 이를 수동태로 바꾼 A be appointed as B는 'A가 B로 임명되다'가 된다는 것을 기억해 주세요. 그리고 목적어가 필요한 동사인데 빈칸 뒤에 목적어가 없다면 수동태가 필요한지 확인해야 하고 yesterday처럼 명확한 시제 단서도 함께 보는 것이 중요해요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 46,
          "stage": "S2 유형·역할 판별",
          "tutor": "먼저 문장 뒤쪽을 볼게요. '~에 의해'라는 뜻을 만드는 부분이 있어요. 그 표현 전체를 찾아 밑줄 쳐볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "mark",
            "prompt": "먼저 문장 뒤쪽을 볼게요. '~에 의해'라는 뜻을 만드는 부분이 있어요. 그 표현 전체를 찾아 밑줄 쳐볼까요?",
            "targetWords": [
              "by expert carpenters"
            ]
          }
        },
        {
          "no": 47,
          "stage": "S3 개념 코칭",
          "tutor": "잘 찾았어요. 전문 목수에 의해서 라는 뜻의 'by expert carpenters'는 누가 행동 하는지 알려주는 표현이에요. 이렇게 by + 행위자가 나오면 수동태가 적절할지 먼저 확인해보면 좋아요. 다만 by만 보고 바로 결정하지 말고, 주어가 실제로 행동을 받는 대상인지도 함께 확인해야 해요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 48,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그럼 주어 products는 직접 무언가를 조립하는 쪽일까요, 목수들에 의해 조립되는 쪽일까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "그럼 주어 products는 직접 무언가를 조립하는 쪽일까요, 목수들에 의해 조립되는 쪽일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "조립하는 쪽"
              },
              {
                "text": "조립되는 쪽",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 49,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요. 그러면 수동태가 필요하겠네요. 이번에는 주어 products의 수를 볼게요. 단수와 복수 중 어느 쪽이고, is와 are 중 무엇이 필요하죠?",
          "focusQ": 2,
          "interaction": {
            "kind": "subjective",
            "prompt": "맞아요. 그러면 수동태가 필요하겠네요. 이번에는 주어 products의 수를 볼게요. 단수와 복수 중 어느 쪽이고, is와 are 중 무엇이 필요하죠?",
            "hint": "복수이고 are이요."
          }
        },
        {
          "no": 50,
          "stage": "S6 오답 제거",
          "tutor": "좋아요. 이제 보기를 볼게요. (A) assemble을 쓰면 제품들이 직접 조립한다는 현재 능동형이 되어 의미가 맞지 않아요. (B) assembled는 과거분사로 쓸 수 있지만, 앞에 be동사가 없어서 여기서는 수동태를 완성하지 못해요. (C) are assembling은 '제품들이 조립하고 있다'라는 능동 진행형이고요. 그러면 are p.p.로 수동태를 완성하는 보기는 무엇일까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 2
          }
        },
        {
          "no": 51,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. products are assembled by expert carpenters는 '제품들이 전문 목수들에 의해 조립된다'라는 뜻이에요. 주어가 행동을 받는다는 점과 by + 행위자까지 모두 잘 맞죠.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 52,
          "stage": "S7 표현 정리",
          "tutor": "이 문제에서는 by + 행위자를 수동태의 중요한 단서로 활용하되, 주어가 실제로 행동을 받는 대상인지까지 확인하는 것이 핵심이에요. assemble은 '조립하다', carpenter는 '목수', piece by piece는 '하나씩, 한 부분씩'이라는 뜻이니 함께 기억해둬요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 53,
          "stage": "S2 유형·역할 판별",
          "tutor": "먼저 빈칸 뒤를 볼게요. Ms. Chin이 맡게 되는 것이 무엇인지 문장에서 찾아 동그라미 쳐볼까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "mark",
            "prompt": "먼저 빈칸 뒤를 볼게요. Ms. Chin이 맡게 되는 것이 무엇인지 문장에서 찾아 동그라미 쳐볼까요?",
            "targetWords": [
              "duties"
            ]
          }
        },
        {
          "no": 54,
          "stage": "S3 개념 코칭",
          "tutor": "잘 찾았어요. 빈칸 바로 뒤에 Mr. Stepp's duties라는 목적어가 이어지고 있죠. assume은 '추정하다'라는 뜻도 있지만, assume duties라고 하면 '업무를 맡다'라는 뜻이에요. 이렇게 동사 뒤에 목적어가 바로 이어지면, 주어가 직접 행동하는 능동태인지 먼저 확인해 보면 좋아요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 55,
          "stage": "S4 구조·흐름 파악",
          "tutor": "Ms. Chin이 직접 Mr. Stepp의 업무를 맡는 건가요, 아니면 누군가가 Ms. Chin에게 어떤 행동을 하는 건가요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "Ms. Chin이 직접 Mr. Stepp의 업무를 맡는 건가요, 아니면 누군가가 Ms. Chin에게 어떤 행동을 하는 건가요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "직접 업무를 맡는 쪽",
                "correct": true
              },
              {
                "text": "행동을 받는 쪽"
              }
            ]
          }
        },
        {
          "no": 56,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요. 그러면 능동태가 필요하겠네요. 이번에는 뒤의 while he is at a weeklong marketing seminar를 볼게요. Mr. Stepp이 세미나에 있는 동안 Ms. Chin이 그의 업무를 맡게 되는 상황이에요. 앞으로 맡게 될 일을 연결하려면 과거형과 미래형 중 어느 쪽이 더 자연스러울까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "맞아요. 그러면 능동태가 필요하겠네요. 이번에는 뒤의 while he is at a weeklong marketing seminar를 볼게요. Mr. Stepp이 세미나에 있는 동안 Ms. Chin이 그의 업무를 맡게 되는 상황이에요. 앞으로 맡게 될 일을 연결하려면 과거형과 미래형 중 어느 쪽이 더 자연스러울까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "과거형"
              },
              {
                "text": "미래형",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 57,
          "stage": "S4 추가 설명",
          "tutor": "좋아요. while 같은 시간절에서는 앞으로의 일을 말하더라도 is처럼 현재형을 쓸 수 있어요. while he is ...가 있다고 해서 주절까지 현재형이어야 하는 건 아니고, 이 문장의 주절에서는 Ms. Chin이 그 기간 동안 업무를 맡게 될 것이므로 미래형이 자연스러워요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 58,
          "stage": "S6 오답 제거",
          "tutor": "이제 보기를 볼게요. (A) assumed는 과거형이라 뒤의 현재 시점과 이어지는 상황에 맞지 않아요. (B) to assume은 to부정사라 이 문장의 주동사 자리를 혼자 완성할 수 없어요. (C) is assumed는 수동태라 'Ms. Chin이 업무를 맡게 된다'가 아니라 'Ms. Chin이 ~라고 여겨진다'는 식의 구조가 되어 뒤의 duties와도 맞지 않고요. 그러면 능동태이면서 앞으로의 일을 나타낼 수 있는 보기는 무엇일까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 3
          }
        },
        {
          "no": 59,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. Ms. Chin will assume Mr. Stepp's duties는 'Ms. Chin이 Mr. Stepp의 업무를 맡게 될 것이다'라는 뜻이에요. 뒤의 '그가 일주일간 세미나에 있는 동안'이라는 내용과도 자연스럽게 연결됩니다.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 60,
          "stage": "S7 표현 정리",
          "tutor": "이 문제에서는 동사 뒤에 목적어가 바로 있으면 능동태인지 먼저 확인하는 것이 중요했어요. assume duties는 '업무를 맡다'라는 표현으로 꼭 기억해두고요. 또 while 같은 시간절은 미래 상황을 말할 때도 현재형을 쓸 수 있음을 알아두세요!",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 61,
          "stage": "S2 유형·역할 판별",
          "tutor": "먼저 that을 볼게요. that이 앞의 어떤 명사를 수식하고 있는지 찾아 동그라미 쳐볼까요?",
          "focusQ": 4,
          "interaction": {
            "kind": "mark",
            "prompt": "먼저 that을 볼게요. that이 앞의 어떤 명사를 수식하고 있는지 찾아 동그라미 쳐볼까요?",
            "targetWords": [
              "building"
            ]
          }
        },
        {
          "no": 62,
          "stage": "S3 개념 코칭",
          "tutor": "맞아요. that은 앞의 the building을 이어서 설명하고 있어요. 그럼 이제 이 건물이 직접 무언가를 하는지, 아니면 어떤 행동을 받는지 확인해볼게요.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 63,
          "stage": "S4 구조·흐름 파악",
          "tutor": "construct는 '건설하다'는 뜻의 뜻이에요. 그럼 여기서 building은 무언가를 직접 건설하는 쪽일까요, 누군가에 의해 건설되는 쪽일까요?",
          "focusQ": 4,
          "interaction": {
            "kind": "choice",
            "prompt": "construct는 '건설하다'는 뜻의 뜻이에요. 그럼 여기서 building은 무언가를 직접 건설하는 쪽일까요, 누군가에 의해 건설되는 쪽일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "건설하는 쪽"
              },
              {
                "text": "건설되는 쪽",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 64,
          "stage": "S4 추가 설명",
          "tutor": "맞아요. 건물이 스스로 다른 것을 건설하는 게 아니라 누군가가 건물을 건설하는 것이죠. 따라서 that 뒤에는 능동태가 아니라 수동태가 필요해요. 즉 be + p.p 형태가 완성되어야 합니다.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 65,
          "stage": "S6 오답 제거",
          "tutor": "이제 보기를 하나씩 볼게요. (A) is constructing은 '건설하고 있다'라는 능동 진행형이라 건물이 직접 무언가를 건설하는 뜻이 돼요. (B) constructed는 여기서 능동 과거형으로 쓰이면 '건물이 무언가를 건설했다'는 구조가 되어 맞지 않고, 수동태로 쓰려면 앞에 be동사가 필요해요. (D) has constructed도 '건물이 무언가를 건설해왔다'라는 현재완료 능동형이고요. 그러면 건물이 건설된 대상이라는 의미를 만드는 수동태는 어떤 보기인가요?",
          "focusQ": 4,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 4
          }
        },
        {
          "no": 66,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. the building that was constructed는 '건설된 건물'이라는 뜻이에요. 그래서 전체적으로는 '건축가의 설계 도면이 실제로 건설된 건물과 크게 다르다'라는 의미가 되어 문맥에도 잘 맞습니다.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 67,
          "stage": "S7 표현 정리",
          "tutor": "이 문제에서는 that이 앞의 the building과 연결되어 있다는 걸 확인하고, 그 건물이 행동을 하는지 받는지 판단하는 게 핵심이에요. 건물은 건설되는 대상이므로 was constructed가 맞아요.",
          "focusQ": 4,
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
        "script": "오늘은 토익 시험에서 제일 먼저 만나게 될 Part 1 사람과 사물 사진이 나오는 문제를 공부해볼 거예요. 가장 쉬워보이지만, 간혹 어려운 문제가 나오면 만점 받기 쉽지 않기도 해요. Part 1 공부의 핵심은 인물과 사물의 동작과 상태를 나타내는 표현 외우기예요! 자, 이제 수업하러 가볼까요?",
        "points": [
          "사람은 '무엇을 하는지' 먼저 보기",
          "사물은 '어디에 어떤 상태인지' 먼저 보기",
          "사진과 다른 동작·사물·위치 빠르게 지우기"
        ]
      },
      summary: [
        {
          "title": "Part 1 사람·사물 사진 핵심 정리",
          "intro": "오늘 배운 내용 빠르게 정리해볼게요. 빈칸에 들어갈 말을 직접 적어서 배운 내용을 정리해보세요!",
          "items": [
            {
              "id": "s1_1",
              "en": "인물 사진에서는 가장 먼저 ___ 을 확인한다.",
              "ko": "맞아요. 인물 사진에서는 먼저 사람이 무엇을 하고 있는지, 핵심 동작을 확인하세요.",
              "answer": "인물의 동작",
              "choices": [],
              "keywords": [
                "인물의 동작"
              ]
            },
            {
              "id": "s1_2",
              "en": "인물이 '지금 ~하고 있다'는 동작은 주로 ___ 형태로 표현한다.",
              "ko": "그렇죠. is painting, is holding처럼 인물이 지금 하고 있는 동작은 be + -ing 형태로 자주 나와요.",
              "answer": "be + -ing",
              "choices": [],
              "keywords": [
                "be + -ing"
              ]
            },
            {
              "id": "s1_3",
              "en": "사물·풍경 사진에서는 사물의 ___를 먼저 확인한다.",
              "ko": "맞아요. 사물 사진에서는 무엇이 어디에 있고, 어떤 상태인지를 먼저 확인하는 게 중요해요.",
              "answer": "위치와 상태",
              "choices": [],
              "keywords": [
                "위치와 상태"
              ]
            },
            {
              "id": "s1_5",
              "en": "동사 뜻을 정확히 몰라도 사진에 ___ 사물·사람·장소가 들리면 오답으로 빠르게 제거할 수 있다.",
              "ko": "맞아요. 선택지에 모르는 단어가 나와도 사진에 아예 없는 핵심 사물·사람·장소가 들리면 빠르게 X 하고 넘어가세요.",
              "answer": "없는",
              "choices": [],
              "keywords": [
                "없는"
              ]
            }
          ]
        },
        {
          "title": "핵심 빈출 표현 정리",
          "intro": "마지막으로 오늘 문제에서 나온 토익 빈출 표현만 확인해볼게요. 영어 표현을 보고 알맞은 뜻을 골라보세요.",
          "items": [
            {
              "id": "s2_1",
              "en": "line up = ___",
              "ko": "잘했어요! 오늘 나온 어휘까지 다 확인했어요. Part 1은 단어를 듣자마자 뜻이 바로 떠올라야 빠르게 풀 수 있어요.. 특히 방금 틀린 어휘는 그냥 넘어가지 말고, 뜻이 바로 나올 때까지 달달 외워두세요. 어휘가 잡혀야 선택지도 훨씬 빨리 들립니다.",
              "answer": "줄지어 놓다",
              "choices": [
                "줄지어 놓다",
                "흩어 놓다",
                "옮겨 놓다"
              ],
              "keywords": [
                "줄지어 놓다"
              ]
            },
            {
              "id": "s2_2",
              "en": "prop A against B = ___",
              "ko": "",
              "answer": "A를 B에 기대어 세우다",
              "choices": [
                "A를 B 위에 쌓다",
                "A를 B에 기대어 세우다",
                "A를 B 안에 넣다"
              ],
              "keywords": [
                "a를 b에 기대어 세우다"
              ]
            },
            {
              "id": "s2_3",
              "en": "scatter = ___",
              "ko": "",
              "answer": "흩어 놓다",
              "choices": [
                "모으다",
                "흩어 놓다",
                "정리하다"
              ],
              "keywords": [
                "흩어 놓다"
              ]
            },
            {
              "id": "s2_4",
              "en": "pour A into B = ___",
              "ko": "",
              "answer": "A를 B에 붓다",
              "choices": [
                "A를 B에 붓다",
                "A를 B에 기대다",
                "A를 B에서 꺼내다"
              ],
              "keywords": [
                "a를 b에 붓다"
              ]
            },
            {
              "id": "s2_5",
              "en": "hang on a wall = ___",
              "ko": "",
              "answer": "벽에 걸려 있다",
              "choices": [
                "벽에 기대어 있다",
                "벽에 걸려 있다",
                "벽에서 떨어지다"
              ],
              "keywords": [
                "벽에 걸려 있다"
              ]
            },
            {
              "id": "s2_6",
              "en": "rest one's arm on ~ = ___",
              "ko": "",
              "answer": "~에 팔을 기대다",
              "choices": [
                "~에 팔을 기대다",
                "~을 향해 손을 뻗다",
                "~을 손으로 들다"
              ],
              "keywords": [
                "~에 팔을 기대다"
              ]
            },
            {
              "id": "s2_7",
              "en": "reach into ~ = ___",
              "ko": "",
              "answer": "~안으로 손을 뻗다",
              "choices": [
                "~을 지나가다",
                "~안으로 손을 뻗다",
                "~위에 올려놓다"
              ],
              "keywords": [
                "~안으로 손을 뻗다"
              ]
            },
            {
              "id": "s2_8",
              "en": "be positioned = ___",
              "ko": "",
              "answer": "배치되어 있다",
              "choices": [
                "배치되어 있다",
                "설치되고 있다",
                "나뉘어 있다"
              ],
              "keywords": [
                "배치되어 있다"
              ]
            },
            {
              "id": "s2_9",
              "en": "along a wall = ___",
              "ko": "",
              "answer": "벽을 따라",
              "choices": [
                "벽 맞은편에",
                "벽을 따라",
                "벽 위에"
              ],
              "keywords": [
                "벽을 따라"
              ]
            },
            {
              "id": "s2_10",
              "en": "a stack of ~ = ___",
              "ko": "",
              "answer": "~ 한 묶음·더미",
              "choices": [
                "~ 한 줄",
                "~ 한 묶음·더미",
                "~ 한 조각"
              ],
              "keywords": [
                "~ 한 묶음·더미"
              ]
            }
          ]
        }
      ],
      practiceOutro: "실전처럼 잘 풀었나요? {전체수} 문제 중 {맞은수} 문제 맞혔어요. 틀린 문제 한번 같이 볼게요.",
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
          "tutor": "자, 문제 다 풀었으니까 여기서 포인트 한번 짚고 갈게요. 사진에서 인물이 '지금 ~하고 있다'는 동작을 나타낼 때는 주로 어떤 형태로 표현할까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "자, 문제 다 풀었으니까 여기서 포인트 한번 짚고 갈게요. 사진에서 인물이 '지금 ~하고 있다'는 동작을 나타낼 때는 주로 어떤 형태로 표현할까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "be + -ing",
                "correct": true
              },
              {
                "text": "be + p.p."
              }
            ]
          }
        },
        {
          "no": 4,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭",
          "tutor": "맞아요.",
          "focusQ": 0,
          "tutorIfWrong": "아쉽지만 아니에요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 5,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭",
          "tutor": "인물이 지금 하고 있는 동작은 주로 be + -ing 형태로 표현해요. 그래서 인물이 등장하는 사진에서는 선택지를 들을 때 인물의 핵심 동작을 나타내는 동사를 먼저 잡는 게 중요해요.",
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
          "tutor": "이제 선택지 봐볼게요. 정답은 B죠? 잘 맞혔어요!",
          "focusQ": 0,
          "tutorIfWrong": "이제 선택지 봐볼게요. 정답은 B였어요. 이런 문제는 시험장 가면 꼭 맞혀주고 넘어가야 해요. 어떤 부분에서 헷갈려서 틀렸는지 같이 확인해볼게요.",
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
          "tutor": "정답 B를 다시 들어볼게요.",
          "focusQ": 0,
          "audio": {
            "kind": "option",
            "qIdx": 0,
            "label": "B"
          },
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
          "no": 8,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "여기서 여자가 하고 있는 핵심 동작을 나타내는 표현이 뭐였죠?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "여기서 여자가 하고 있는 핵심 동작을 나타내는 표현이 뭐였죠?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "is painting",
                "correct": true
              },
              {
                "text": "on an easel"
              }
            ]
          }
        },
        {
          "no": 9,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. is painting이 여자의 핵심 동작을 나타내는 표현이에요.",
          "focusQ": 0,
          "tutorIfWrong": "다시 생각해보세요. 지금 여자가 그림을 그리는 동작이 핵심이죠? 따라서 is painting이 핵심 동사예요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 10,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "그 뒤에는 on an easel이 나오죠. easel은 그림 그릴 때 그림판을 놓는 틀이에요. 그런데 easel이 무슨 뜻인지 몰라도 is painting이 사진 속 여자의 동작과 맞는다는 건 확인할 수 있죠? 이렇게 핵심 동사가 사진과 일치하는데 뒤에 나온 단어 잘 모르겠으면 일단 정답 후보로 두고 다른 선택지를 확실히 지워가면 돼요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 11,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (A)",
          "tutor": "그럼 선택지 A 볼게요.",
          "focusQ": 0,
          "audio": {
            "kind": "option",
            "qIdx": 0,
            "label": "A"
          },
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
          "no": 12,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (A)",
          "tutor": "핵심 동사 is rinsing 뒤에 in a sink가 나오죠. 여기서도 rinsing 뜻 몰라도 확실히 아닌 거 뭐예요?",
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
            "prompt": "핵심 동사 is rinsing 뒤에 in a sink가 나오죠. 여기서도 rinsing 뜻 몰라도 확실히 아닌 거 뭐예요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "a paintbrush"
              },
              {
                "text": "in a sink",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 13,
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
          "no": 14,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (C)",
          "tutor": "다음 선택지 C 볼게요.",
          "focusQ": 0,
          "audio": {
            "kind": "option",
            "qIdx": 0,
            "label": "C"
          },
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
          "no": 15,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (C)",
          "tutor": "이건 진짜 아니죠? is visiting, art gallery 둘다 전혀 사진에 등장하지 않으니까 바로 X 하고 넘겨요.",
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
          "no": 16,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (D)",
          "tutor": "마지막으로 선택지 D 볼게요.",
          "focusQ": 0,
          "audio": {
            "kind": "option",
            "qIdx": 0,
            "label": "D"
          },
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
          "no": 17,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (D)",
          "tutor": "is holding, a tube of paint 가 들리죠. 사진에서 여자가 물감 튜브를 들고 있나요?",
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
            "prompt": "is holding, a tube of paint 가 들리죠. 사진에서 여자가 물감 튜브를 들고 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 18,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (D)",
          "tutor": "맞아요. 물감 튜브를 들고 있지 않으니까 이것도 오답으로 넘기면 돼요.",
          "focusQ": 0,
          "tutorIfWrong": "자세히 봐보세요. 여자가 물감 튜브가 아니라 팔레트 같은 거를 들고 있죠? 그러니까 D도 오답으로 넘기면 돼요.",
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
          "no": 19,
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
          "no": 20,
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
          "no": 21,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번 사진에는 사람은 안보이고 사물, 풍경만 보이죠? 이렇게 사물, 풍경만 나오는 사진에서는 사물의 위치와 배치를 잘 확인해야 해요. 뭐가 보이나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "subjective",
            "prompt": "이렇게 사물, 풍경만 나오는 사진에서는 사물의 위치와 배치를 잘 확인해야 해요. 뭐가 보이나요?",
            "hint": "행거에 옷이 걸려 있어요 왼쪽 선반에는 물건이 놓여 있어요. 오른쪽 벽에는 모자가 있어요."
          }
        },
        {
          "no": 22,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "학생 풀이",
          "tutor": "맞아요. 사진 자세히 보면 행거에 옷이 걸려있고 왼쪽에 선반에 물건이 쌓여있고 우측 벽에는 모자가 있어요. 이제 선택지 듣고 문제 풀어볼게요.",
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
          "no": 23,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "자, 문제 다 풀었으니까 여기서 포인트 한번 짚고 갈게요. 사진에서 사람이 사물을 놓는 중인가요, 사물이 이미 놓여 있는 상태인가요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "자, 문제 다 풀었으니까 여기서 포인트 한번 짚고 갈게요. 사진에서 사람이 사물을 놓는 중인가요, 사물이 이미 놓여 있는 상태인가요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "사람이 사물을 놓는 중"
              },
              {
                "text": "사물이 이미 놓인 상태",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 24,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "그렇죠!",
          "focusQ": 1,
          "tutorIfWrong": "다시 자세히 보세요. 사진에서 사물들이 이미 놓여 있는 상태이죠?",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 25,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "이렇게 사람이 사물을 옮기거나 놓는 행동이 진행 중인 게 아니라, 사물이 이미 어떤 상태로 놓여 있을 때 be + p.p.나 have/has been + p.p. 형태가 선택지로 자주 나와요. Part 1에서는 두 형태 모두 사물이 이미 어떤 상태로 놓여 있을 때 쓰인다고 알아두면 돼요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 26,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "이제 선택지 봐볼게요. 정답은 A죠. 잘 맞혔어요!",
          "focusQ": 1,
          "tutorIfWrong": "이제 선택지 봐볼게요. 정답은 A였어요. 어떤 부분이 어려웠는지 정답이랑 오답 같이 확인해볼게요.",
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
          "no": 27,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "정답 A를 다시 들어볼게요.",
          "focusQ": 1,
          "audio": {
            "kind": "option",
            "qIdx": 1,
            "label": "A"
          },
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
          "no": 28,
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
                "text": "O",
                "correct": true
              },
              {
                "text": "X"
              }
            ]
          }
        },
        {
          "no": 29,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "그렇죠! 신발 중 일부가 바닥에 줄지어 놓여 있으니까 some of the shoes와 on the floor가 사진과 정확히 맞아요. 또 누군가 신발을 줄 세우는 중이 아니라 신발이 이미 줄지어 있는 상태이기 때문에 are lined up도 잘 맞죠. 여기서 line up은 '한 줄로 세우다'라는 뜻이에요. 사물 사진에서 자주 나오는 표현이니까 외워두세요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 30,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "다시 자세히 봐보세요. 신발 두 켤레는 왼쪽 선반에 있고, 나머지 신발 두 켤레는 옷장 아래 나란히 세워져 있죠? 따라서 some of the shoes와 on the floor 표현은 사진과 정확히 맞아요. 또 누군가 신발을 줄 세우는 중이 아니라 신발이 이미 줄지어 있는 상태이기 때문에 are lined up도 잘 맞죠. 여기서 line up은 '한 줄로 세우다'라는 뜻이에요. 사물 사진에서 자주 나오는 표현이니까 외워두세요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 31,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (B)",
          "tutor": "다음으로 선택지 B 볼게요.",
          "focusQ": 1,
          "audio": {
            "kind": "option",
            "qIdx": 1,
            "label": "B"
          },
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
          "no": 32,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (B)",
          "tutor": "옷이 개어져서 쌓여 있지 않죠? 오답으로 X 하고 넘어가면 돼요.",
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
          "no": 33,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (C)",
          "tutor": "다음 선택지 C 볼게요.",
          "focusQ": 1,
          "audio": {
            "kind": "option",
            "qIdx": 1,
            "label": "C"
          },
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
          "no": 34,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (C)",
          "tutor": "C는 완전 오답이죠? 핸드백이 바구니 위에 없으니까 빠르게 넘겨버려요.",
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
          "no": 35,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (D)",
          "tutor": "마지막 D 봐볼게요.",
          "focusQ": 1,
          "audio": {
            "kind": "option",
            "qIdx": 1,
            "label": "D"
          },
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
          "no": 36,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (D)",
          "tutor": "are being stored처럼 be being p.p. 가 나오면 사물에 어떤 동작이 지금 가해지고 있는 중이어야 해요. 그런데 사진에서는 모자가 이미 걸려 있을 뿐, 모자를 보관하는 동작이 진행되고 있지는 않죠?",
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
            "prompt": "are being stored처럼 be being p.p. 가 나오면 사물에 어떤 동작이 지금 가해지고 있는 중이어야 해요. 그런데 사진에서는 모자가 이미 걸려 있을 뿐, 모자를 보관하는 동작이 진행되고 있지는 않죠?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 37,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (D)",
          "tutor": "맞아요.",
          "focusQ": 1,
          "tutorIfWrong": "아니에요.",
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
          "no": 38,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (D)",
          "tutor": "be being pp가 나오면 누군가에 의해 모자가 보관되는 장면이 나와야 해요. 그리고 on some shelves '선반 위에'라는 위치도 사진과 맞지 않으니까 오답입니다.",
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
          "no": 39,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 정리할게요. 사물 사진은 '어디에 어떻게 놓여 있는지'를 먼저 보고, 이미 놓여 있는 상태인지, 지금 놓이는 동작이 진행 중인지 구분하세요. be lined up은 '줄지어 놓여 있다', stack은 '쌓다' 였어요. 외워두고 가세요!",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 40,
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
          "no": 41,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번에는 조금 어려운 문제 가볼게요. 이것도 사물과 풍경이 중심인 사진이에요. 사물 사진에서는 무엇이 어디에 있고, 어떤 상태인지 먼저 확인한다고 했죠? 사진에서 눈에 띄는 사물과 위치를 말해볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "subjective",
            "prompt": "사진에서 눈에 띄는 사물과 위치를 말해볼까요?",
            "hint": "화분이 있어요 선반 위에 화분이 있어요 식물이 있어요 화분이 선반 위에 있고 식물이 있어요"
          }
        },
        {
          "no": 42,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "학생 풀이",
          "tutor": "맞아요. 선반 위에 화분 여러 개가 있고 바닥에는 식물이 있죠? 사진 속 사물과 위치를 확인했으니 이제 선택지를 듣고 정답을 골라볼게요.",
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
          "no": 43,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "그럼 한번만 더 포인트 짚고 가볼게요. 사물이 이미 어떤 상태로 놓여 있으면 be + p.p.나 have/has been + p.p. 형태가 자주 나온다고 했죠? 반대로 be being + p.p.는 사물에 어떤 동작이 지금 진행되고 있을 때 쓰인다고 했어요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 44,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "이제 선택지 봐볼게요. 정답은 D죠. 잘 맞혔어요!",
          "focusQ": 2,
          "tutorIfWrong": "이제 선택지 봐볼게요. 정답은 D였어요. 어떤 부분이 헷갈렸는지 정답이랑 오답을 같이 확인해볼게요.",
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
          "no": 45,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "정답 D를 다시 들어볼게요.",
          "focusQ": 2,
          "audio": {
            "kind": "option",
            "qIdx": 2,
            "label": "D"
          },
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
          "no": 46,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "Some pots, 일부 화분들이, have been lined up, 줄지어 놓여 있다, on a shelf, 선반 위에 라는 뜻이에요. 사진에서 일부 화분이 선반 위에 줄지어 놓여 있나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "Some pots, 일부 화분들이, have been lined up, 줄지어 놓여 있다, on a shelf, 선반 위에 라는 뜻이에요. 사진에서 일부 화분이 선반 위에 줄지어 놓여 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O",
                "correct": true
              },
              {
                "text": "X"
              }
            ]
          }
        },
        {
          "no": 47,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "그렇죠!",
          "focusQ": 2,
          "tutorIfWrong": "다시 사진 자세히 봐보세요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 48,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "사진에 화분들이 선반 위에 줄지어 놓여 있으니까 some pots, lined up, on a shelf가 모두 사진과 맞아요. 그리고 지금 누군가 화분을 줄 세우는 중이 아니라 이미 줄지어 놓여있는 상태이기 때문에 have been lined up도 잘 맞아요. line up은 앞 문제에서도 나왔죠? 사물 사진에서 자주 나오는 표현이에요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 49,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (A)",
          "tutor": "이제 A 볼게요.",
          "focusQ": 2,
          "audio": {
            "kind": "option",
            "qIdx": 2,
            "label": "A"
          },
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
          "no": 50,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (A)",
          "tutor": "are being watered는 식물에 물을 주는 행동이 지금 진행되고 있다는 뜻이에요. 사진에서 실제로 식물에 물을 주는 행동이 진행되고 있나요?",
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
            "prompt": "are being watered는 식물에 물을 주는 행동이 지금 진행되고 있다는 뜻이에요. 사진에서 실제로 식물에 물을 주는 행동이 진행되고 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 51,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (A)",
          "tutor": "맞아요.",
          "focusQ": 2,
          "tutorIfWrong": "사진 다시 자세히 봐보세요.",
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
          "no": 52,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (A)",
          "tutor": "식물은 보이더라도 물을 주는 행동은 진행되고 있지 않죠. 사진에 있는 사물이 들렸다고 바로 정답으로 고르면 안 돼요. be being + p.p.가 들리면 그 행동이 실제로 진행 중인지까지 확인해야 해요.",
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
          "no": 53,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "다음 B 들어볼게요.",
          "focusQ": 2,
          "audio": {
            "kind": "option",
            "qIdx": 2,
            "label": "B"
          },
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
          "no": 54,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "이 선택지는 단어가 좀 어려웠죠? shovel은 '삽', shed는 '창고' 라는 뜻이에요. 여기서 동사 prop 모른다고 해도 사진에 삽이 있어요, 없어요?",
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
            "prompt": "shovel은 '삽', shed는 '창고' 라는 뜻이에요. 여기서 동사 prop 모른다고 해도 사진에 삽이 있어요, 없어요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 55,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "그렇죠.",
          "focusQ": 2,
          "tutorIfWrong": "다시 사진 봐보세요.",
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
          "no": 56,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "사진에 삽이 없죠? shovel이라는 단어만 알아도 바로 X 할 수 있어요. prop A against B는 'A를 B에 기대어 세워 두다'라는 뜻이에요. 지금 나온 단어랑 표현들 꼭 외워두세요.",
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
          "no": 57,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (C)",
          "tutor": "다음 C 들어볼게요.",
          "focusQ": 2,
          "audio": {
            "kind": "option",
            "qIdx": 2,
            "label": "C"
          },
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
          "no": 58,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (C)",
          "tutor": "scattered라고 들었죠? scattered는 '흩어져 있는'이라는 뜻이에요. 사진에서 큰 나뭇잎들이 바닥 여기저기에 흩어져 있지 않으니까 오답이에요.",
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
          "no": 59,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 오늘 나온 빈출 표현 정리할 게요. line up은 '줄지어 놓다', prop A against B는 'A를 B에 기대어 세워 두다', scatter는 '흩어 놓다'라는 뜻이었어요. 이 정도 어휘는 꼭 외워두세요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 60,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "마무리 멘트",
          "tutor": "좋아요. 이제 실전 문제로 넘어가볼게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 101,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "실전 안내",
          "tutor": "유형 학습에서 배웠던 전략이랑 개념 적용해서 총 4 문제 실전처럼 풀어볼 거예요. 문제 음원 끝나면 바로 정답 체크하도록 연습해보세요. 시작할게요",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        }
      ],
      review: [
        {
          "no": 61,
          "stage": "S5 정답 근거 연결",
          "tutor": "인물이 나오는 사진이었죠? 정답 D를 다시 들어볼게요.",
          "focusQ": 0,
          "audio": {
            "kind": "option",
            "qIdx": 0,
            "label": "D"
          },
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
          "no": 62,
          "stage": "S5 정답 근거 연결",
          "tutor": "is picking up, 집어 들고 있다, an empty cup, 빈 컵을이라고 했죠. 사진에서 남자가 빈 컵을 집어 들고 있나요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "is picking up, 집어 들고 있다, an empty cup, 빈 컵을이라고 했죠. 사진에서 남자가 빈 컵을 집어 들고 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O",
                "correct": true
              },
              {
                "text": "X"
              }
            ]
          }
        },
        {
          "no": 63,
          "stage": "S5 정답 근거 연결",
          "tutor": "그렇죠.",
          "focusQ": 0,
          "tutorIfWrong": "다시 사진을 자세히 보세요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 64,
          "stage": "S5 정답 근거 연결",
          "tutor": "인물 사진에서는 가장 먼저 사람이 실제로 하고 있는 동작을 확인해야 해요. 사진에서 남자가 커피 머신 위에 있는 빈 컵을 집어 들고 있어요. is picking up 동사 표현이 사진과 정확히 맞죠? pick up은 '집어 들다'라는 뜻이에요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 65,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A는 He's tying a cloth apron.이에요. tie는 '매다, 묶다', apron은 '앞치마'라는 뜻이에요. 일단 사진에서 남자가 앞치마를 하고 있긴 하지만, 지금 앞치마를 묶는 동작을 하고 있는 건 아니죠. 사진에 앞치마가 있다고 해서 apron만 듣고 고르면 안 되고, tying이라는 동작까지 봐야 해요.",
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
          "no": 66,
          "stage": "S6 오답 제거 (B)",
          "tutor": "B의 pouring beans into a coffee machine은 커피 머신에 원두를 붓고 있다는 뜻이에요. 사진에는 이런 동작이 없으니까 바로 X 하면 됩니다.",
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
          "no": 67,
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
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 68,
          "stage": "S6 오답 제거 (C)",
          "tutor": "맞아요.",
          "focusQ": 0,
          "tutorIfWrong": "다시 한번 사진 봐보세요.",
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
          "no": 69,
          "stage": "S6 오답 제거 (C)",
          "tutor": "customer가 사진에 아예 없죠. 이렇게 사진에 없는 사람이나 사물이 나오면 빠르게 오답으로 지울 수 있어요.",
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
          "no": 70,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 표현만 정리할게요. pick up은 집어 들다, pour은 붓다, hand는 건네주다 예요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 71,
          "stage": "S5 정답 근거 연결",
          "tutor": "사물이랑 풍경만 나오는 사진이었죠? 정답 A를 다시 들어볼게요.",
          "focusQ": 1,
          "audio": {
            "kind": "option",
            "qIdx": 1,
            "label": "A"
          },
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
          "no": 72,
          "stage": "S5 정답 근거 연결",
          "tutor": "Some artwork, 일부 미술품이, is hanging, 걸려 있다, on a wall, 벽에라고 했죠. 사진에서 미술품이 벽에 걸려 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "Some artwork, 일부 미술품이, is hanging, 걸려 있다, on a wall, 벽에라고 했죠. 사진에서 미술품이 벽에 걸려 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O",
                "correct": true
              },
              {
                "text": "X"
              }
            ]
          }
        },
        {
          "no": 73,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요.",
          "focusQ": 1,
          "tutorIfWrong": "사진 다시 한번 봐보세요. 액자가 벽에 걸려있어요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 74,
          "stage": "S5 정답 근거 연결",
          "tutor": "hang은 '걸다'라는 뜻도 있지만, 그림이나 물건이 이미 걸려 있는 상태를 말할 때 be hanging 형태로 표현할 수도 있어요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 75,
          "stage": "S6 오답 제거 (B)",
          "tutor": "B. Reading materials have been left on a sofa. 에서 reading materials 읽을거리는 사진에 있지만 소파 위가 아니라 탁자 위에 있죠? 선택지에 사물은 맞아도 위치가 다르면 오답이에요.",
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
          "no": 76,
          "stage": "S6 오답 제거 (C)",
          "tutor": "C. Some windows are being installed. 에서 are being installed는 창문이 지금 설치되고 있는 중이라는 뜻이에요. 사진에서 창문이 설치되고 있나요?",
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
            "prompt": "C. Some windows are being installed. 에서 are being installed는 창문이 지금 설치되고 있는 중이라는 뜻이에요. 사진에서 창문이 설치되고 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 77,
          "stage": "S6 오답 제거 (C)",
          "tutor": "그렇죠.",
          "focusQ": 1,
          "tutorIfWrong": "다시 한번 사진 봐보세요.",
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
          "no": 78,
          "stage": "S6 오답 제거 (C)",
          "tutor": "창문이 이미 설치되어있는 상태이죠? 이렇게 이미 설치된 상태일 때는 are installed나 have been installed라고 해야 맞아요. are being installed가 맞으려면 창문을 설치하는 작업이 실제로 진행 중인 모습이 보여야 해요. 꼭 주의하세요!",
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
          "no": 79,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D는 Some potted plants 화분이, have fallen 떨어져 있다고 했어요, on the floor 바닥에. 아니죠? 화분이 있긴 하지만 바닥에 떨어져 있지는 않아서 오답이죠.",
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
          "no": 80,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 핵심 정리할게요. is hanging on a wall은 '벽에 걸려 있다', have been left는 '놓여 있다, 남겨져 있다', are being installed는 '설치되고 있는 중이다'라는 뜻이에요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 81,
          "stage": "S5 정답 근거 연결",
          "tutor": "사람 두 명이 나오는 사진이죠? 이런 사진은 각 인물의 동작을 잘 봐야 해요. 정답 B를 다시 들어볼게요.",
          "focusQ": 2,
          "audio": {
            "kind": "option",
            "qIdx": 2,
            "label": "B"
          },
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
          "no": 82,
          "stage": "S5 정답 근거 연결",
          "tutor": "여자들 중 한 명이, is resting her arm, 팔을 기대고 있다, on a glass counter, 유리 진열대에라고 했어요. 사진에서 한 여자가 유리 진열대에 팔을 기대고 있나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "여자들 중 한 명이, is resting her arm, 팔을 기대고 있다, on a glass counter, 유리 진열대에라고 했어요. 사진에서 한 여자가 유리 진열대에 팔을 기대고 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O",
                "correct": true
              },
              {
                "text": "X"
              }
            ]
          }
        },
        {
          "no": 83,
          "stage": "S5 정답 근거 연결",
          "tutor": "그렇죠.",
          "focusQ": 2,
          "tutorIfWrong": "사진 다시 한번 봐보세요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 84,
          "stage": "S5 정답 근거 연결",
          "tutor": "여러 사람이 등장하는 사진에서는 누가 어떤 동작을 하고 있는지 정확하게 연결해야 해요. 한 여자가 유리 진열대에 팔을 기대고 있죠? 따라서 B가 정답이에요.",
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
          "no": 85,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A는 여자 중 한 명이 is reaching into a shopping cart. 쇼핑 카트 안으로 손을 뻗고 있다고 했어요. 사진 속 여자가 손을 뻗고 있기는 하지만 쇼핑 카트 안으로 뻗는 거는 아니죠? 이렇게 사진에 없는 단어가 나오면 빠르게 X하고 넘어가요.",
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
          "no": 86,
          "stage": "S6 오답 제거 (C)",
          "tutor": "C에는 pushing a button on a cash register가 나왔는데, 사진에 계산대 버튼 없죠? 오답으로 바로 넘겨버리면 돼요.",
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
          "no": 87,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D의 여자 중 한 명이 opening a display case, 진열장을 열고 있다고 했어요. 사진 대충 보면 헷갈릴 수 있어서 주의해야 해요. 여자가 진열장을 여는 동작이 사진에 있나요?",
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
            "prompt": "D의 여자 중 한 명이 opening a display case, 진열장을 열고 있다고 했어요. 사진 대충 보면 헷갈릴 수 있어서 주의해야 해요. 여자가 진열장을 여는 동작이 사진에 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 88,
          "stage": "S6 오답 제거 (D)",
          "tutor": "그렇죠.",
          "focusQ": 2,
          "tutorIfWrong": "헷갈릴 수 있는 사진 다시 봐보세요.",
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
          "no": 89,
          "stage": "S6 오답 제거 (D)",
          "tutor": "여자가 진열장에 손을 뻗고 있지만, 열고 있는 건 아니죠. 이렇게 핵심 동작을 정확히 확인해야 해요.",
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
          "no": 90,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 표현 정리하고 갈게요. rest one's arm on 은 '무엇무엇에 팔을 기대다', reach into 는 '뭐뭐 안으로 손을 뻗다' 예요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 91,
          "stage": "S5 정답 근거 연결",
          "tutor": "사물이랑 풍경이 나오는 사진이죠? 정답 C를 다시 들어볼게요.",
          "focusQ": 3,
          "audio": {
            "kind": "option",
            "qIdx": 3,
            "label": "C"
          },
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
          "no": 92,
          "stage": "S5 정답 근거 연결",
          "tutor": "Some desktops, 일부 책상이, have been divided, 나뉘어 있다, with partitions, 파티션으로 라는 의미예요. 사진에서 책상이 파티션으로 나뉘어 있나요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "Some desktops, 일부 책상이, have been divided, 나뉘어 있다, with partitions, 파티션으로 라는 의미예요. 사진에서 책상이 파티션으로 나뉘어 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O",
                "correct": true
              },
              {
                "text": "X"
              }
            ]
          }
        },
        {
          "no": 93,
          "stage": "S5 정답 근거 연결",
          "tutor": "그렇죠.",
          "focusQ": 3,
          "tutorIfWrong": "놓치기 쉬운데 사진 다시 자세히 봐보세요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 94,
          "stage": "S5 정답 근거 연결",
          "tutor": "사진에서 책상 상판이 파티션으로 나뉘어 있는 상태이죠? 사물 사진에서는 이렇게 사물이 어떤 상태로 배치돼 있는지를 정확하게 들어야 해요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 95,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A. Trash bins are being emptied. 에서 are being emptied는 쓰레기통이 비워지고 있는 중이라는 뜻이에요. 사진에서 쓰레기통이 비워지는 중인가요?",
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
            "prompt": "A. Trash bins are being emptied. 에서 are being emptied는 쓰레기통이 비워지고 있는 중이라는 뜻이에요. 사진에서 쓰레기통이 비워지는 중인가요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 96,
          "stage": "S6 오답 제거 (A)",
          "tutor": "맞아요.",
          "focusQ": 3,
          "tutorIfWrong": "사진 다시 한번 봐보세요.",
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
          "no": 97,
          "stage": "S6 오답 제거 (A)",
          "tutor": "쓰레기통이 있지만 누군가에 의해 비워지고 있지는 않죠? be being p.p.가 들리면 실제 그 행동이 진행 되는 중인지 꼭 확인하세요.",
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
          "no": 98,
          "stage": "S6 오답 제거 (B)",
          "tutor": "B는 Chairs have been positioned, 의자들이 놓여있다, along a wall. 벽을 따라서 라고 했어요. along은 '뭐뭐를 따라서'라는 의미예요. 의자들이 벽을 따라 놓여 있다는 뜻인데, 사진의 의자 위치와 다르죠? 이렇게 위치를 나타내는 전치사 표현 잘 알아두어야 함정에 안넘어갑니다.",
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
          "no": 99,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D는 There is a stack of documents 서류 더미가 있다, at each workstation. 각 업무공간마다 라고 했죠. 그런데 사진에 a stack of documents, 서류 더미가 보이지 않죠? 사진에 없는 사물이 나온 선택지는 바로 X 하면 돼요.",
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
          "no": 100,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 표현 정리하고 갈게요. partition은 '칸막이', be positioned는 '배치되어 있다', along a wall은 '벽을 따라'라는 뜻이에요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        }
      ],
    },
    'RC-P5-08': {
      intro: {
        "script": "오늘은 Part 5에서 자주 나오는 능동태와 수동태 문제를 공부해볼 거예요. 공식처럼 몇 가지 사항들만 잘 익히면 빠르게 풀고 넘어갈 수 있는 유형이에요. 핵심은 주어와 동사의 관계를 잘 파악하는 거예요. 그럼 수업하러 가볼까요?",
        "points": [
          "주어와 동사 관계 능수동 파악하기",
          "동사 뒤 목적어 유무 확인하기",
          "수·시제 확인하기"
        ]
      },
      summary: [
        {
          "title": "Part 5 능동태·수동태 핵심 정리",
          "intro": "오늘 배운 내용 빠르게 정리해볼게요. 빈칸에 들어갈 말을 직접 적어서 배운 내용을 정리해보세요!",
          "items": [
            {
              "id": "s1_2",
              "en": "수동태의 기본 형태는 ___이다.",
              "ko": "그렇죠. 수동태의 기본 형태는 'be + p.p.'예요.",
              "answer": "be p.p.",
              "choices": [],
              "keywords": [
                "be p.p.",
                "be + p.p."
              ]
            },
            {
              "id": "s1_3",
              "en": "능동·수동을 판단할 때 첫째, ___을 확인한다.",
              "ko": "맞아요. 주어가 행동하는 쪽인지, 받는 쪽인지 먼저 확인한다고 했죠?",
              "answer": "주어와 동사의 관계",
              "choices": [],
              "keywords": [
                "주어와 동사의 관계"
              ]
            },
            {
              "id": "s1_4",
              "en": "주어와 동사의 관계가 헷갈리면 두 번째로, 동사 뒤에 ___가 있는지 확인한다.",
              "ko": "맞아요. 동사 뒤 목적어 유무까지 보면 능수동을 더 정확하게 판단할 수 있어요.",
              "answer": "목적어",
              "choices": [],
              "keywords": [
                "목적어"
              ]
            },
            {
              "id": "s1_5",
              "en": "능수동을 판단한 뒤 선택지가 여러 개 남으면 마지막으로 ___까지 확인한다.",
              "ko": "그렇죠. yesterday 같은 시제 단서나 주어의 수까지 마지막으로 확인하세요.",
              "answer": "수·시제",
              "choices": [],
              "keywords": [
                "수·시제"
              ]
            }
          ]
        },
        {
          "title": "핵심 빈출 표현 정리",
          "intro": "마지막으로 오늘 문제에서 나온 토익 빈출 표현만 확인해볼게요. 영어 표현을 보고 알맞은 뜻을 골라보세요.",
          "items": [
            {
              "id": "s2_1",
              "en": "component part = ___",
              "ko": "수고했어요! 오늘 나온 어휘까지 다 확인했어요. 능수동태 문제는 동사의 뜻을 알아야 주어와 동사의 관계를 정확히 판단할 수 있어요. 특히 틀린 어휘는 뜻이 바로 떠오를 때까지 달달 외워주세요.",
              "answer": "구성 부품",
              "choices": [
                "구성 부품",
                "교체 비용",
                "생산 공정"
              ],
              "keywords": [
                "구성 부품"
              ]
            },
            {
              "id": "s2_2",
              "en": "standardize = ___",
              "ko": "",
              "answer": "표준화하다",
              "choices": [
                "조립하다",
                "표준화하다",
                "변경하다"
              ],
              "keywords": [
                "표준화하다"
              ]
            },
            {
              "id": "s2_3",
              "en": "take over = ___",
              "ko": "",
              "answer": "업무 등을 맡다",
              "choices": [
                "업무 등을 맡다",
                "업무를 미루다",
                "업무를 보고하다"
              ],
              "keywords": [
                "업무 등을 맡다"
              ]
            },
            {
              "id": "s2_4",
              "en": "direct A to do = ___",
              "ko": "",
              "answer": "A에게 ~하라고 지시하다",
              "choices": [
                "A에게 ~하라고 지시하다",
                "A가 ~하는 것을 허락하다",
                "A에게 ~을 요청받다"
              ],
              "keywords": [
                "a에게 ~하라고 지시하다"
              ]
            },
            {
              "id": "s2_5",
              "en": "alter = ___",
              "ko": "",
              "answer": "변경하다",
              "choices": [
                "변경하다",
                "면제하다",
                "조립하다"
              ],
              "keywords": [
                "변경하다"
              ]
            },
            {
              "id": "s2_6",
              "en": "waive = ___",
              "ko": "",
              "answer": "면제하다",
              "choices": [
                "면제하다",
                "지불하다",
                "인상하다"
              ],
              "keywords": [
                "면제하다"
              ]
            },
            {
              "id": "s2_7",
              "en": "appoint A as B = ___",
              "ko": "",
              "answer": "A를 B로 임명하다",
              "choices": [
                "A를 B로 임명하다",
                "A를 B와 비교하다",
                "A를 B에게 소개하다"
              ],
              "keywords": [
                "a를 b로 임명하다"
              ]
            },
            {
              "id": "s2_8",
              "en": "assemble = ___",
              "ko": "",
              "answer": "조립하다",
              "choices": [
                "분리하다",
                "배치하다",
                "조립하다"
              ],
              "keywords": [
                "조립하다"
              ]
            },
            {
              "id": "s2_9",
              "en": "assume = ___",
              "ko": "",
              "answer": "맡다",
              "choices": [
                "중단하다",
                "평가하다",
                "맡다"
              ],
              "keywords": [
                "맡다"
              ]
            },
            {
              "id": "s2_10",
              "en": "construct = ___",
              "ko": "",
              "answer": "짓다·건설하다",
              "choices": [
                "철거하다",
                "짓다·건설하다",
                "수리하다"
              ],
              "keywords": [
                "짓다·건설하다"
              ]
            }
          ]
        }
      ],
      practiceOutro: "실전처럼 잘 풀었나요? {전체수} 문제 중 {맞은수} 문제 맞혔어요. 틀린 문제 한번 같이 볼게요.",
      turns: [
        {
          "no": 1,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S2 유형·역할 판별",
          "tutor": "자, Part 5는 문제 처음부터 해석하면서 읽고 있으면 뒤에 절대 다 못 풀어요. 필요한 부분에서만 해석하면 돼요. 문제 보면 먼저 빈칸 앞뒤 확인해보세요. 빈칸이 어떤 자리인지 판단해야 해요. 빈칸 바로 앞에 뭐가 나오죠? 동그라미 쳐보세요.",
          "focusQ": 0,
          "interaction": {
            "kind": "mark",
            "prompt": "자, Part 5는 문제 처음부터 해석하면서 읽고 있으면 뒤에 절대 다 못 풀어요. 필요한 부분에서만 해석하면 돼요. 문제 보면 먼저 빈칸 앞뒤 확인해보세요. 빈칸이 어떤 자리인지 판단해야 해요. 빈칸 바로 앞에 뭐가 나오죠?",
            "targetWords": [
              "are"
            ]
          }
        },
        {
          "no": 2,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S2 유형·역할 판별",
          "tutor": "잘했어요.",
          "focusQ": 0,
          "tutorIfWrong": "다시 한번 봐보세요. 빈칸 바로 앞에 단어에 동그라미 쳐보세요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 3,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S2 유형·역할 판별",
          "tutor": "are이 있죠? be동사 뒤에 빈칸이 나오면 -ing, p.p., 명사 같은 형태가 올 수 있어요. 이럴 때는 are과 함께 동사 형태를 이루는 -ing와 p.p. 중 어떤 형태가 맞는지부터 확인하는 게 좋아요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 4,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭",
          "tutor": "자, 개념 짧게 한번 짚고 갈게요. 문장에서 주어와 동작의 관계에 따라 능동태와 수동태로 표현할 수 있어요.주어가 동작을 직접 하는 주체이면 능동태, 주어가 행위를 당하는 대상이면 수동태를 써요. 능동태는 일반 동사나 be + -ing 같은 형태로 쓰고, 수동태는 be + p.p. 형태로 써요. 그럼 문장 다시 봐볼게요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 5,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S4 구조·흐름 파악",
          "tutor": "능동인지 수동인지 판단할 때는 첫째로, 주어와 동사의 관계를 확인해야 해요. 이 문장에서 주어는 All component parts of Lowry automatic doors이죠. 동사 standardize는 '표준화하다'라는 뜻이에요. 주어인 '자동문의 모든 구성품'은 무언가를 표준화하는 주체인가요, 표준화되는 대상인가요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "능동인지 수동인지 판단할 때는 첫째로, 주어와 동사의 관계를 확인해야 해요. 이 문장에서 주어는 All component parts of Lowry automatic doors이죠. 동사 standardize는 '표준화하다'라는 뜻이에요. 주어인 '자동문의 모든 구성품'은 무언가를 표준화하는 주체인가요, 표준화되는 대상인가요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "표준화하는 주체"
              },
              {
                "text": "표준화되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 6,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그렇죠! 구성품은 표준화되는 대상이니까 수동태 are + p.p.가 필요해요.",
          "focusQ": 0,
          "tutorIfWrong": "아니에요, 구성품은 스스로 표준화하는 게 아니라 표준화되는 대상이에요. 따라서 수동태 are + p.p.가 필요해요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 7,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S4 구조·흐름 파악",
          "tutor": "의미 확인했으면, 둘째, 목적어가 있는지 없는지 확인해야 해요. 빈칸 뒤에 목적어 있어요, 없어요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "의미 확인했으면, 둘째, 목적어가 있는지 없는지 확인해야 해요. 빈칸 뒤에 목적어 있어요, 없어요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 8,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요.",
          "focusQ": 0,
          "tutorIfWrong": "아쉽지만 아니에요. 헷갈릴 수 있으니 다시 봐볼게요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 9,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S4 구조·흐름 파악",
          "tutor": "빈칸 뒤의 for easy replacement는 '간편한 교체를 위해'라는 뜻의 전치사구예요. 전치사구는 standardize의 목적어가 될 수 없어요. 이렇게 주어가 동작을 받는 대상인지 먼저 보고, 동사 뒤에 목적어가 없는지까지 확인하면 수동태라는 걸 더 확실하게 판단할 수 있어요. 그러면 이제 정답으로 수동태 고르기 전에 마지막으로 명사 선택지만 한번 확인하면 돼요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 10,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거",
          "tutor": "이제 선택지 봐볼게요. D. standardization 은 명사니깐 문장 구조상 be동사 뒤에 보어로 올 수 있어요. 그런데 의미상 '자동문의 모든 구성품은 표준화이다'는 어색하죠? 따라서 오답이에요. 그럼 답이 수동태인 것이 확실해졌죠? 나머지 오답 선택지도 짧게 봐볼게요. C. standardizes는 3인칭 단수 동사죠. be동사 뒤에는 are standardizes처럼 일반 동사 형태를 바로 이어서 쓸 수는 없어요. 마지막으로 A. standardizing을 넣으면 '모든 구성품이 무언가를 표준화하고 있다'는 능동의 의미가 되니까 오답이죠?",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 11,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 B. standardized예요. 모든 구성품은 표준화되는 대상이고, 뒤에 목적어도 없으니까 수동태 형태가 적절해요. 문장 해석해보면 \"All component parts of Lowry automatic doors , 로우리 자동문의 모든 구성품은, are standardized, 표준화되어 있다, for easy replacement., 간편한 교체를 위해 .\"라는 의미죠.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 12,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 핵심 정리하고 갈게요. 능수동태 문제 풀 때는 첫째, 주어와 동사와의 관계 확인하고, 둘째, 빈칸 뒤 목적어 유무 확인하라고 했죠? 알아둬야할 어휘는 component part 구성 부품, standardize 표준화하다, replacement 교체(품) 이에요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 13,
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
          "no": 14,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S2 유형·역할 판별",
          "tutor": "이 문제도 먼저 빈칸 앞뒤를 확인해서 빈칸이 어떤 자리인지 판단해야 해요. 빈칸 바로 앞에 뭐가 나오죠? 동그라미 쳐보세요.",
          "focusQ": 1,
          "interaction": {
            "kind": "mark",
            "prompt": "이 문제도 먼저 빈칸 앞뒤를 확인해서 빈칸이 어떤 자리인지 판단해야 해요. 빈칸 바로 앞에 뭐가 나오죠?",
            "targetWords": [
              "cannot"
            ]
          }
        },
        {
          "no": 15,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S2 유형·역할 판별",
          "tutor": "잘했어요.",
          "focusQ": 1,
          "tutorIfWrong": "아니에요. 빈칸 바로 앞에 보세요. cannot에 동그라미 쳐야겠죠?",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 16,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S2 유형·역할 판별",
          "tutor": "cannot은 조동사죠. 조동사 뒤에는 어떤 형태가 와야 하죠?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "cannot은 조동사죠. 조동사 뒤에는 어떤 형태가 와야 하죠?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "동사원형",
                "correct": true
              },
              {
                "text": "명사"
              },
              {
                "text": "to부정사"
              }
            ]
          }
        },
        {
          "no": 17,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S2 유형·역할 판별",
          "tutor": "그렇죠.",
          "focusQ": 1,
          "tutorIfWrong": "아쉽지만 정답이 아니에요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 18,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S2 유형·역할 판별",
          "tutor": "조동사 뒤에는 동사원형이 와야 해요. 그럼 동사원형 형태가 들어간 선택지를 봐야겠죠? 그런데 능동인지 수동인지에 따라 alter가 될 수도 있고 be altered가 될 수도 있어요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 19,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "자, 개념 짧게 한번 짚고 갈게요. 조동사가 있어도 능수동을 판단하는 방법은 똑같아요. 주어가 동작을 직접 하면 조동사 + 동사원형, 주어가 그 동작을 받으면 조동사 + be + p.p.를 써요. 그럼 문장 다시 봐볼게요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 20,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S4 구조·흐름 파악",
          "tutor": "능수동을 판단할 때 첫째로, 주어와 동사의 관계를 확인해야 한다고 했죠? 이 문장의 주어는 The settings in your Buzz virtual meeting room이죠. 주어인 '가상 회의실의 설정'이 무언가를 변경하는 주체예요, 변경되는 대상이에요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "이 문장의 주어는 The settings in your Buzz virtual meeting room이죠. 주어인 '가상 회의실의 설정'이 무언가를 변경하는 주체예요, 변경되는 대상이에요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "변경하는 주체"
              },
              {
                "text": "변경되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 21,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그렇죠. 설정은 누군가에 의해 변경되는 대상이니까 수동태가 필요해요.",
          "focusQ": 1,
          "tutorIfWrong": "다시 생각해보세요. 가상 회의실의 설정은 스스로 무언가를 변경하는 주체가 아니라 변경되는 대상이에요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 22,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S4 구조·흐름 파악",
          "tutor": "의미 확인했으면 둘째, 목적어가 있는지 확인하라고 했죠? 빈칸 뒤에 목적어가 있나요, 없나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "빈칸 뒤에 목적어가 있나요, 없나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 23,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요.",
          "focusQ": 1,
          "tutorIfWrong": "아니에요. 다시 한번 같이 봐볼게요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 24,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S4 구조·흐름 파악",
          "tutor": "by any user는 '어떤 사용자에 의해서'라는 전치사구이고 동사의 목적어가 아니에요. 여기서 by any user는 중요한 힌트예요. by + 행위자가 나오면 수동태인지 먼저 의심해야 해요. 그러면 주어는 변경되는 대상이고, 뒤에 목적어도 없으니까 수동태가 필요하죠?",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 25,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거",
          "tutor": "그럼 선택지 빠르게 볼게요. 우선 조동사 뒤에 동사 원형 아닌 선택지들 먼저 지워보면 A. to alter는 to부정사 형태이고 C. altering은 현재분사 형태이죠? 모두 X 치고 넘기면 돼요. 선택지 B. alter는 동사원형이라 형태는 가능하지만 능동의 의미로 'The settings, 설정이, 변경할 수 없다'가 되니까 어색하죠. 또 뒤에 목적어도 없으므로 오답이에요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 26,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 D. be altered예요. 주어는 변경되는 대상이고, 뒤에 목적어도 없으니까 수동태 cannot be altered가 필요해요. 문장 다시 짧게 해석해보면 'The settings in your Buzz virtual meeting room, 버즈 가상 회의실의 설정은, cannot be altered , 변경될 수 없다, by any user, 어떤 사용자에 의해서도, without the 10-digit control code, 10자리 제어 코드 없이는.' 이에요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 27,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 핵심 정리하고 갈게요. 조동사가 있는 능수동 문제도 첫째, 주어와 동사의 관계를 확인하고, 둘째, 빈칸 뒤 목적어 유무를 확인하면 돼요. 수동이면 조동사 + be + p.p. 형태를 기억하세요. 외워둬야 할 어휘는 virtual 가상의, alter 변경하다예요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 28,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "마무리 멘트",
          "tutor": "이제 다음 문제로 넘어가볼게요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 29,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S2 유형·역할 판별",
          "tutor": "이 문제도 먼저 빈칸 앞뒤부터 확인해볼게요. 빈칸 앞에는 주어 Ms. Levy가 있고, 뒤에는 the team이 나오죠. 빈칸은 어떤 자리일까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "이 문제도 먼저 빈칸 앞뒤부터 확인해볼게요. 빈칸 앞에는 주어 Ms. Levy가 있고, 뒤에는 the team이 나오죠. 빈칸은 어떤 자리일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "보어 자리"
              },
              {
                "text": "동사 자리",
                "correct": true
              },
              {
                "text": "목적어 자리"
              }
            ]
          }
        },
        {
          "no": 30,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S2 유형·역할 판별",
          "tutor": "맞아요!",
          "focusQ": 2,
          "tutorIfWrong": "아니에요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 31,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S2 유형·역할 판별",
          "tutor": "주어 Ms. Levy 뒤에 빈칸이 있고, 그 뒤에 명사구 the team이 나오죠? 문장에 필요한 동사가 없으니까 빈칸은 동사 자리예요. 이렇게 빈칸이 동사 자리일 때는 제일 먼저 태를 확인해야 해요. 그러면 이번에도 동사의 능수동부터 판단해볼게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 32,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "자, 능수동 문제는 주어와 동사의 관계부터 확인해야 한다고 했죠? 문장 봐볼게요. 주어 Ms. Levy 레비 씨가 팀에게 진행 상황을 보고하라고 지시하는 주체예요, 지시 받는 대상이에요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "문장 봐볼게요. 주어 Ms. Levy 레비 씨가 팀에게 진행 상황을 보고하라고 지시하는 주체예요, 지시 받는 대상이에요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "지시하는 주체",
                "correct": true
              },
              {
                "text": "지시 받는 대상"
              }
            ]
          }
        },
        {
          "no": 33,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그렇죠! 레비 씨가 직접 지시하는 주체예요. 그런데 주체인지 대상인지 좀 헷갈릴 수 있어요.",
          "focusQ": 2,
          "tutorIfWrong": "아쉽지만 아니에요. 레비 씨는 지시하는 주체예요. 조금 헷갈리죠?",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 34,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "이럴 때는 둘째, 빈칸 뒤에 목적어가 있는지 확인해야 해요. the team은 목적어일까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "이럴 때는 둘째, 빈칸 뒤에 목적어가 있는지 확인해야 해요. the team은 목적어일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O",
                "correct": true
              },
              {
                "text": "X"
              }
            ]
          }
        },
        {
          "no": 35,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요. 목적어로 the team이라는 명사구가 왔죠.",
          "focusQ": 2,
          "tutorIfWrong": "the team은 목적어가 맞아요. 목적어 자리에는 명사구가 올 수 있어요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 36,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "따라서 빈칸 뒤에 목적어가 있으니까 능동태라는 걸 한 번 더 확인할 수 있겠죠? 참고로 'direct + 사람 + to 동사원형'은 '사람에게 ~ 하라고 지시하다'라는 의미예요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 37,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "여기까지 잘했는데 능동태를 찾아보니 능동태가 A. directed, B. direct, C. is directing 세 개나 있죠? 이럴 때는 이제 셋째, 동사의 수와 시제까지 확인해야 해요. 앞의 When she took over the project에서 took over가 어떤 시제죠?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "이럴 때는 이제 셋째, 동사의 수와 시제까지 확인해야 해요. 앞의 When she took over the project에서 took over가 어떤 시제죠?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "과거 시제",
                "correct": true
              },
              {
                "text": "현재 시제"
              },
              {
                "text": "미래 시제"
              }
            ]
          }
        },
        {
          "no": 38,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요",
          "focusQ": 2,
          "tutorIfWrong": "다시 봐보세요. took over는 take over의 과거 형태이죠?",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 39,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그러면 프로젝트를 맡았던 과거 시점의 이야기죠. 그래서 주절인 빈칸에도 과거 시제 동사가 들어가야 해요. 능동태이면서 과거 시제인 선택지를 찾으면 됩니다.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 40,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거",
          "tutor": "그러면 선택지 빠르게 볼게요. B. direct는 능동이지만 주어 Ms. Levy가 단수이므로 수가 맞지 않고, 앞의 과거 시점과 시제도 맞지 않아요. C. is directing은 현재 진행형이라 역시 시제가 맞지 않아요. D. was directed는 수동태라서 바로 먼저 X하고 넘어가야죠?",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 41,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 A. directed 예요. 문장 해석해보면, 'When she took over the project, 프로젝트를 맡았을 때, Ms. Levy, 레비 씨는, directed, 지시했다, the team , 팀에게, to provide frequent progress updates over the next month, 다음 한 달 동안 진행 상황보고를 자주 하라고' 예요. 레비 씨가 팀에게 지시하는 주체이고, 뒤에 the team이라는 목적어가 있으며, took over과 같은 과거 시점이니까 directed가 가장 적절해요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 42,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S7 표현 정리",
          "tutor": "그럼 마지막으로 핵심 정리하고 갈게요. 능수동태 문제는 첫째, 주어와 동사의 관계를 확인하고, 둘째, 빈칸 뒤 목적어 유무를 확인해요. 만약 시제 단서가 있으면 셋째, 앞이나 뒤의 시제까지 확인해야 해요. 외워둬야 할 표현은 take over 업무 등을 맡다, direct 지시하다, frequent 잦은, progress 진행 이에요.",
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
          "tutor": "이제 다음 문제로 넘어가볼게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 44,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S2 유형·역할 판별",
          "tutor": "이번에도 먼저 빈칸 앞뒤부터 확인해볼게요. 빈칸은 어떤 자리일까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "이번에도 먼저 빈칸 앞뒤부터 확인해볼게요. 빈칸은 어떤 자리일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "보어 자리"
              },
              {
                "text": "동사 자리",
                "correct": true
              },
              {
                "text": "목적어 자리"
              }
            ]
          }
        },
        {
          "no": 45,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S2 유형·역할 판별",
          "tutor": "잘했어요.",
          "focusQ": 3,
          "tutorIfWrong": "아니에요. 다시 봐보세요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 46,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞에 긴 주어 The layout of Pierce University's new residence hall 뒤에 동사가 없죠. 따라서 빈칸은 동사 자리예요. 이번에도 마찬가지로 빈칸이 동사면 뭐부터 확인하라고 했죠?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "빈칸 앞에 긴 주어 The layout of Pierce University's new residence hall 뒤에 동사가 없죠. 따라서 빈칸은 동사 자리예요. 이번에도 마찬가지로 빈칸이 동사면 뭐부터 확인하라고 했죠?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "수"
              },
              {
                "text": "태",
                "correct": true
              },
              {
                "text": "시제"
              }
            ]
          }
        },
        {
          "no": 47,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S3 개념 코칭",
          "tutor": "맞아요. 그러면 능수동 판단하기 전에 잠깐 개념 짧게 한번 짚고 갈게요. 이번 문제에는 be being + p.p. 형태가 나와요. 이건 '지금 ~되고 있다'처럼 어떤 행위가 진행 중인 수동태를 나타내는 표현이에요. 그래도 능수동 판단 순서는 똑같습니다.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 48,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S4 구조·흐름 파악",
          "tutor": "첫째, 주어와 동사의 관계를 확인할게요. 이 문장의 주어 The layout '배치'는 스스로 무언가를 설계하는 주체예요, 누군가에 의해 설계되는 대상이에요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "첫째, 주어와 동사의 관계를 확인할게요. 이 문장의 주어 The layout '배치'는 스스로 무언가를 설계하는 주체예요, 누군가에 의해 설계되는 대상이에요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "설계하는 주체"
              },
              {
                "text": "설계되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 49,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그렇죠. layout은 누군가에 의해 설계되는 대상이죠.",
          "focusQ": 3,
          "tutorIfWrong": "아니에요. 배치는 스스로 무언가를 설계할 수 없고, 누군가에 의해 설계되는 대상이에요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 50,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그럼 둘째, 빈칸 뒤에 목적어가 있는지도 확인해볼게요. 빈칸 뒤에 목적어가 있나요, 없나요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "그럼 둘째, 빈칸 뒤에 목적어가 있는지도 확인해볼게요. 빈칸 뒤에 목적어가 있나요, 없나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 51,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요",
          "focusQ": 3,
          "tutorIfWrong": "아니에요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 52,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S4 구조·흐름 파악",
          "tutor": "with input from students는 '학생들의 의견을 반영하여'라는 의미의 전치사구이고 목적어가 아니에요. 주어는 설계되는 대상이고, 뒤에 목적어도 없으니까 수동태가 필요하다는 걸 확인할 수 있죠.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 53,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 오답 제거",
          "tutor": "그럼 선택지 빠르게 볼게요. 우선 능동인 선택지 다 지워봅시다. A. designs, B. was designing 모두 능동이죠? 모두 X하고 오답으로 표시하면 돼요. D. designed는 p.p. 형태지만, 수동태가 되려면 앞에 be동사가 있어야 해요. 따라서 얘도 오답이에요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 54,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 C. is being designed예요. '기숙사의 배치가 설계되고 있다'는 수동의 의미가 자연스럽고, 뒤에 목적어도 없죠. be being + p.p.는 이렇게 어떤 일이 지금 진행되고 있는 수동태를 나타낼 때 써요. 문장 마지막으로 해석해보면, 'The layout of Pierce University's new residence hall, 피어스 대학교의 새 기숙사의 배치는, is being designed, 설계되고 있다, with input from students, 학생들의 의견을 반영하여' 라는 뜻이에요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 55,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 핵심 정리하고 갈게요. 능수동태 문제는 첫째, 주어와 동사의 관계를 확인하고, 둘째, 빈칸 뒤 목적어 유무를 확인헤요. 그리고 be being + p.p.는 '~되고 있는 중이다'라는 진행 수동태라는 것도 기억해 두세요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 56,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "마무리 멘트",
          "tutor": "이제 실전 문제로 넘어가볼게요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 104,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "실전 안내",
          "tutor": "유형 학습에서 배웠던 전략이랑 개념 적용해서 총 5 문제 실전처럼 풀어볼 거예요. 문제 음원 끝나면 바로 정답 체크하도록 연습해보세요. 시작할게요",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        }
      ],
      review: [
        {
          "no": 57,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞뒤 먼저 확인해봅시다. 빈칸 바로 앞에 will be가 있죠? be 동사 뒤에는 -ing, p.p., 명사 같은 형태가 올 수 있다고 했죠.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 58,
          "stage": "S4 구조·흐름 파악",
          "tutor": "이럴 때는 먼저 be 동사와 함께 동사 형태를 이루는 -ing와 p.p. 중 어떤 게 맞는지부터 확인하라고 했죠? 그러면 첫째로 주어와 동사의 관계 확인할게요. 주어는 the entry fee, 입장료고 동사는 waive '면제하다'예요. 주어 입장료는 무언가를 면제하는 주체예요, 면제되는 대상이에요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "그러면 첫째로 주어와 동사의 관계 확인할게요. 주어는 the entry fee, 입장료고 동사는 waive '면제하다'예요. 주어 입장료는 무언가를 면제하는 주체예요, 면제되는 대상이에요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "면제하는 주체"
              },
              {
                "text": "면제되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 59,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그렇죠.",
          "focusQ": 0,
          "tutorIfWrong": "다시 생각해보세요. 주어인 입장료는 스스로 무언가를 면제하는 주체가 아니라, 면제되는 대상이에요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 60,
          "stage": "S4 구조·흐름 파악",
          "tutor": "다음으로 빈칸 뒤에 목적어 확인하라고 했죠? 빈칸 뒤에 목적어 있어요, 없어요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "빈칸 뒤에 목적어 있어요, 없어요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 61,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요",
          "focusQ": 0,
          "tutorIfWrong": "헷갈릴 수 있지만 아니에요",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 62,
          "stage": "S4 구조·흐름 파악",
          "tutor": "for Cordell residents는 전치사구라서 waive의 목적어가 아니에요. 주어가 동작의 대상이고, 동사 뒤에 목적어도 없으니까 수동태가 맞겠죠? 이렇게 수동태가 들어가야하는 거 확인했으면, 명사형 선택지만 한번 더 확인하고 가면 돼요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 63,
          "stage": "S6 오답 제거",
          "tutor": "명사 D. waivers 는 문장 구조상으로는 be동사 뒤에 보어로 들어갈 수 있어요. 그런데 의미상 '입장료는 면제 증서일 것이다'가 되어 어색해져버리죠. 따라서 D는 오답이에요.",
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
          "no": 64,
          "stage": "S6 오답 제거",
          "tutor": "그러면 이제 나머지 선택지도 볼게요. A. waives는 3인칭 단수 동사이니까 이미 be동사가 나온 시점에서 동사를 또 쓸 수 없으니 가장 먼저 X 표시하고 넘어가면 돼요. 그리고 B. waiving 은 능동태니까 안되겠죠? B도 오답으로 넘길게요.",
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
          "no": 65,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 C. waived예요. will be waived가 되어 '면제될 것이다'라는 미래를 나타내는 수동태가 돼죠. 문장 해석해보면, 코델 도자기 전시회 웹사이트에 따르면, 입장료는, 면제 될 것이다, 코델 주민들에게는 이라는 의미예요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 66,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 알아둬야할 표현 정리할게요. entry fee는 입장료, resident는 주민, waive는 면제하다 예요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 67,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞뒤 먼저 확인해볼게요. 빈칸 앞에는 주어 Romesh Sastry가 있고 문장에 동사가 아직 없죠? 그러면 빈칸은 동사 자리예요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 68,
          "stage": "S4 구조·흐름 파악",
          "tutor": "동사 자리인 거 확인했으면 이제 능동인지 수동인지 확인하면 돼요. 먼저 주어와 동사의 관계부터 보라고 했죠? 동사는 appoint, '임명하다' 이고, 뒤에 as the editor-in-chief '편집장으로서'가 나오죠. 주어인 Romesh Sastry는 누군가를 임명하는 주체예요, 편집장으로 임명되는 대상이에요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "동사는 appoint, '임명하다' 이고, 뒤에 as the editor-in-chief '편집장으로서'가 나오죠. 주어인 Romesh Sastry는 누군가를 임명하는 주체예요, 편집장으로 임명되는 대상이에요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "임명하는 주체"
              },
              {
                "text": "임명되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 69,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그렇죠.",
          "focusQ": 1,
          "tutorIfWrong": "주어인 Romesh Sastry는 임명되는 대상이에요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 70,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그런데 사실 여기서 주체인지 대상인지 좀 헷갈리고 확실하지 않을 수 있어요. 그래서 다음으로 빈칸 뒤에 목적어 있는지 확인하라고 했죠? 동사 appoint가 받는 목적어가 뒤에 있어요, 없어요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "동사 appoint가 받는 목적어가 뒤에 있어요, 없어요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 71,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요. 전치사구 as the editor-in-chief ~ 는 동사의 목적어가 아니죠. 그러면 이제 수동태인 거 확실해졌죠.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 72,
          "stage": "S6 오답 제거",
          "tutor": "그럼 선택지 볼게요. 능동태인 선택지들 다 X 표시하면 되겠죠? B. appoints 는 3인칭 단수, C. is appointing 진행형 능동, D. appointed는 동사의 과거형이라서 모두 능동 형태이니까 오답으로 X 하고 넘어가요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 73,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 A . was appointed 예요. 문장 해석해보면 로메시 사스트리는, 임명되었다, <개리슨 헤럴드> 신문의 편집장으로, 어제 라는 뜻이에요. 주어는 임명되는 대상이고, 뒤에 목적어가 없고, yesterday까지 있으니까 과거 수동태 was appointed, '임명되었다'가 확실하죠.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 74,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 알아둬야 할 표현 정리할게요. appoint는 임명하다, editor-in-chief는 편집장이에요. 그리고 yesterday처럼 시제를 알려주는 표현도 꼭 확인하세요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 75,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞뒤 먼저 보고 빈칸이 무슨 자리인지 확인하라고 했죠? 앞에는 주어 All of Nakano Furniture's products가 있고, 문장에 동사가 없죠. 그러면 빈칸은 동사 자리예요. 빈칸이 동사 자리면 제일 먼저 뭐 확인하라고 했어요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "앞에는 주어 All of Nakano Furniture's products가 있고, 문장에 동사가 없죠. 그러면 빈칸은 동사 자리예요. 빈칸이 동사 자리면 제일 먼저 뭐 확인하라고 했어요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "수"
              },
              {
                "text": "태",
                "correct": true
              },
              {
                "text": "시제"
              }
            ]
          }
        },
        {
          "no": 76,
          "stage": "S2 유형·역할 판별",
          "tutor": "그렇죠.",
          "focusQ": 2,
          "tutorIfWrong": "다른 것도 확인해야겠지만 가장 먼저 태 확인하는 게 좋아요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 77,
          "stage": "S2 유형·역할 판별",
          "tutor": "그러면 능수동태 확인해 볼게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 78,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그러면 첫째, 주어와 동사의 관계부터 볼게요. 동사는 assemble, '조립하다'예요. 주어인 '나카노 가구의 모든 제품'은 무언가를 조립하는 주체예요, 조립되는 대상이에요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "그러면 첫째, 주어와 동사의 관계부터 볼게요. 동사는 assemble, '조립하다'예요. 주어인 '나카노 가구의 모든 제품'은 무언가를 조립하는 주체예요, 조립되는 대상이에요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "조립하는 주체"
              },
              {
                "text": "조립되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 79,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요.",
          "focusQ": 2,
          "tutorIfWrong": "다시 생각해보세요. 제품은 스스로 무언가를 조립할 수 없고, 조립되는 대상이죠?",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 80,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그러면 다음으로 assemble이 받는 목적어가 뒤에 있는지 볼게요. 빈칸 뒤에 목적어가 있나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "그러면 다음으로 assemble이 받는 목적어가 뒤에 있는지 볼게요. 빈칸 뒤에 목적어가 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O"
              },
              {
                "text": "X",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 81,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요.",
          "focusQ": 2,
          "tutorIfWrong": "헷갈릴 수 있는데 다시 같이 봐볼게요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 82,
          "stage": "S4 구조·흐름 파악",
          "tutor": "뒤의 piece by piece는 '하나씩'이라는 뜻의 부사구예요. 부사구는 동사 assemble의 목적어가 될 수 없어요. 그리고 뒤에 by expert carpenters, '전문 목수들에 의해'라는 표현 나왔죠. by + 사람처럼 행위자가 나오면 수동태인지 의심해보라고 했죠? 따라서 정리해보면 주어는 조립되는 대상이고, 목적어도 없으니까 빈칸에는 수동태가 들어가야 해요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 83,
          "stage": "S6 오답 제거",
          "tutor": "이제 선택지 빠르게 볼게요. 능동태인 것들 다 X 치면 되겠죠? A. assemble을 쓰면 제품들이 무언가를 조립한다는 능동의 의미가 되고, 뒤에 목적어도 없어서 오답이에요. B. assembled도 마찬가지로 능동이라서 오답이죠. C. are assembling도 '제품들이 무언가를 조립하고 있다'는 능동 진행형태라 오답이에요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 84,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 D. are assembled예요. 제품은 조립되는 대상이고 뒤에 목적어도 없으니까 수동태 are assembled, '조립된다'가 적절해요. 해석해보면, 나카노 가구의 모든 제품은, 조립된다, 한 조각씩, 전문 목수에 의해 라는 뜻이에요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 85,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 알아둬야 할 표현 정리할게요. assemble은 조립하다, expert는 전문가의, carpenter는 목수예요. by + 사람은 수동태에서 누구에 의해 행위가 이루어지는지 알려주는 표현으로 자주 나오니까 힌트로 잘 알아두세요!",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 86,
          "stage": "S2 유형·역할 판별",
          "tutor": "먼저 빈칸 앞뒤 확인해서 빈칸이 무슨 자리인지 확인해야겠죠? 앞에는 주어 Ms. Chin, 뒤에는 명사구 Mr. Stepp's duties가 있고 문장에 주절 동사가 없네요. 그러면 빈칸은 동사 자리예요. 동사 자리이면 제일 먼저 태 확인해야한다고 했죠?",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 87,
          "stage": "S4 구조·흐름 파악",
          "tutor": "첫째, 주어와 동사의 관계부터 볼게요. assume은 여기서 '업무를 맡다'라는 뜻이에요. 주어인 Ms. Chin은 업무를 직접 맡는 주체인지 업무를 맡게 되는 대상인지 확인해야 해요. 의미를 보면 Ms. Chin은 업무를 직접 맡는 주체가 맞아요. 그런데 주체인지 대상인지 확실하지 않다면 다음으로 뒤에 목적어 있는지 확인하면 돼요. 빈칸 뒤에 목적어가 있나요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "첫째, 주어와 동사의 관계부터 볼게요. assume은 여기서 '업무를 맡다'라는 뜻이에요. 주어인 Ms. Chin은 업무를 직접 맡는 주체인지 업무를 맡게 되는 대상인지 확인해야 해요. 의미를 보면 Ms. Chin은 업무를 직접 맡는 주체가 맞아요. 그런데 주체인지 대상인지 확실하지 않다면 다음으로 뒤에 목적어 있는지 확인하면 돼요. 빈칸 뒤에 목적어가 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "O",
                "correct": true
              },
              {
                "text": "X"
              }
            ]
          }
        },
        {
          "no": 88,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요.",
          "focusQ": 3,
          "tutorIfWrong": "다시 한번 잘 봐보세요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 89,
          "stage": "S4 구조·흐름 파악",
          "tutor": "뒤에 명사구 Mr. Stepp's duties 가 동사의 목적어로 나왔어요. 그러면 이제 능동태가 필요한 게 확실해졌어요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 90,
          "stage": "S6 오답 제거",
          "tutor": "그럼 선택지도 볼게요. 먼저 수동태 지워볼게요. C. is assumed 먼저 오답으로 X 하면 되겠죠? 그러면 이제 능동태 선택지 중에 고르면 되는데 B. to assume은 to부정사라서 동사 자리에 올 수 없죠. 얘도 X 예요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 91,
          "stage": "S6 오답 제거",
          "tutor": "그러면 이제 A. assumed와 D. will assume이 남았죠. 이럴 때는 셋째로 시제를 확인하라고 했죠? while he is at a weeklong marketing seminar는 스텝 씨가 세미나에 가 있는 동안의 상황이죠. 그 기간 동안 친 씨가 업무를 맡게 될 거라는 의미로는 어떤 시제가 자연스러울까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "while he is at a weeklong marketing seminar는 스텝 씨가 세미나에 가 있는 동안의 상황이죠. 그 기간 동안 친 씨가 업무를 맡게 될 거라는 의미로는 어떤 시제가 자연스러울까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "과거 시제"
              },
              {
                "text": "미래 시제",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 92,
          "stage": "S6 오답 제거",
          "tutor": "그렇죠!",
          "focusQ": 3,
          "tutorIfWrong": "아니에요. 같이 다시 봐볼게요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 93,
          "stage": "S6 오답 제거",
          "tutor": "while 같은 시간 표현 뒤에서는 앞으로 일어날 일을 말할 때도 will 대신 현재형을 쓸 수 있어요. 그래서 while he is at a weeklong marketing seminar는 '앞으로 스텝 씨가 세미나에 참석해 있는 동안'이라는 의미에요. 그러면 그 기간 동안 친 씨가 업무를 맡게 될 것이라는 미래의 의미가 자연스럽죠? 따라서 선택지 A. assumed 는 과거 시제니까 오답이에요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 94,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 D. will assume이에요. 주어가 행동하는 주체이고, 동사의 목적어가 있고, 미래 시제까지 맞으니까 will assume이 적절해요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 95,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 알아둬야 할 표현 정리할게요. assume은 여기서 '업무를 맡다'라는 의미이고, while 뒤에 현재형이 나와도 미래 일을 말할 수 있다는 것을 잘 알아두세요!",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 96,
          "stage": "S2 유형·역할 판별",
          "tutor": "문제 보자마자 빈칸 앞뒤 확인해서 빈칸이 무슨 자리인지 확인해야 한다고 했죠? 빈칸 앞에 that에 동그라미 치세요.",
          "focusQ": 4,
          "interaction": {
            "kind": "mark",
            "prompt": "문제 보자마자 빈칸 앞뒤 확인해서 빈칸이 무슨 자리인지 확인해야 한다고 했죠?",
            "targetWords": [
              "that"
            ]
          }
        },
        {
          "no": 97,
          "stage": "S2 유형·역할 판별",
          "tutor": "여기서 that은 바로 앞의 the building을 수식하는 관계대명사예요. 관계대명사 that은 the building을 대신하면서 관계사절의 주어 역할을 해요. 자, 그런데 that 뒤에 동사가 없죠? 선택지도 한번 쓱 보세요. 모두 동사 형태니까 빈칸은 동사 자리예요. 빈칸이 동사 자리이면 제일 먼저 동사의 태 확인하라고 했죠?",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 98,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그럼 먼저 주어와 동사의 관계를 볼게요. 이렇게 관계대명사 that이 주어 역할을 할 때는, that이 가리키는 선행사 the building과 동사 construct의 관계를 확인하면 돼요. 동사 construct는 '건설하다'라는 뜻이에요. 건물은 무언가를 건설하는 주체예요, 건설되는 대상이에요?",
          "focusQ": 4,
          "interaction": {
            "kind": "choice",
            "prompt": "그럼 먼저 주어와 동사의 관계를 볼게요. 이렇게 관계대명사 that이 주어 역할을 할 때는, that이 가리키는 선행사 the building과 동사 construct의 관계를 확인하면 돼요. 동사 construct는 '건설하다'라는 뜻이에요. 건물은 무언가를 건설하는 주체예요, 건설되는 대상이에요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "건설하는 주체"
              },
              {
                "text": "건설되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 99,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그렇죠.",
          "focusQ": 4,
          "tutorIfWrong": "다시 생각해보세요. 건물은 스스로 무언가를 건설할 수 없고, 건설되는 대상이죠?",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 100,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그러면 다음으로 빈칸 뒤에 목적어가 있는지 확인해야겠죠. 빈칸 뒤에 목적어가 없죠. 그러면 빈칸에는 수동태가 들어가야겠네요.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 101,
          "stage": "S6 오답 제거",
          "tutor": "이제 선택지 볼게요. 능동태인 선택지 먼저 다 지워야겠죠? A. is constructing은 '건물이 무언가를 건설하고 있다'는 능동 진행형이죠. B. constructed는 동사의 과거형이고 D. has constructed는 동사의 완료형이죠? 모두 능동태이므로 X 하고 넘어가세요.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 102,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 C. was constructed예요. 건물은 지어지는 대상이고 뒤에 목적어도 없으니까 수동태 was constructed가 맞죠. 문장 해석해보면 '건축가가 그린 그 구조물의 도면은, 많이 다르다, 지어진 건물과'라는 의미예요.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 103,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 알아둬야 할 표현 정리할게요. architect는 건축가, structure는 구조물, construct는 짓다·건설하다, differ는 다르다예요. 관계대명사가 나오면 that이 대신하는 주어가 무엇인지 먼저 확인하세요.",
          "focusQ": 4,
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
