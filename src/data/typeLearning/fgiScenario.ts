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
        "script": "오늘은 Part 1을 이 세 가지 포인트를 중심으로 연습해 볼게요.\nPart 1은 사진을 보고 네 개의 문장을 들은 다음, 사진을 가장 정확하게 설명하는 문장 하나를 고르는 문제예요.\n사람이 중심인 사진에서는 사람의 동작을, 사물이 중심인 사진에서는 사물의 위치나 상태를 먼저 확인해야 해요.\n그리고 진행 중인 동작과 이미 되어 있는 상태를 구분하는 것도 중요해요.\n첫 번째 유형부터 시작해 볼까요?",
        "points": [
          "사람이 무엇을 하고 있는지 확인하기",
          "사물이 어디에 있고 어떤 상태인지 확인하기",
          "진행 중인 동작과 이미 되어 있는 상태 구분하기"
        ]
      },
      summary: [
        {
          "title": "Part 1 사람·사물 사진 핵심 정리",
          "intro": "오늘 배운 내용 빠르게 정리해 볼게요. 빈칸에 들어갈 말을 채워서 문장을 소리 내어 말해 보세요!",
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
          "intro": "마지막으로 오늘 문제에서 나온 토익 빈출 표현만 확인해 볼게요. 영어 표현을 보고 알맞은 뜻을 골라보세요.",
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
          "tutor": "사람 사진이니 동작을 위주로 봐볼게요! 여자는 지금 뭘 하고 있죠?",
          "focusQ": 0,
          "interaction": {
            "kind": "subjective",
            "prompt": "사람 사진이니 동작을 위주로 봐볼게요! 여자는 지금 뭘 하고 있죠?",
            "hint": "그림을 그리고 있어요."
          }
        },
        {
          "no": 2,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "학생 풀이",
          "tutor": "좋아요, 이제 선택지 듣고 문제 풀어볼게요.",
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
          "stage": "채점",
          "tutor": "맞아요, B예요! 핵심 근거만 딱 볼게요.",
          "focusQ": 0,
          "gate": "ifCorrect",
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
          "no": 4,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "채점",
          "tutor": "정답이 아니에요. 핵심 동작부터 다시 잡고 한 번 더 풀어볼게요.",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 5,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭",
          "tutor": "여자가 이젤 위의 캔버스에 붓을 대고 있고 그림을 그리고 있어요. 이를 가장 잘 설명하는 선택지가 답이 되겠죠.",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 6,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "B에서 정답을 확신한 핵심 표현은 뭐였어요?",
          "focusQ": 0,
          "gate": "ifCorrect",
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
            "prompt": "B에서 정답을 확신한 핵심 표현은 뭐였어요?",
            "hint": "painting a picture"
          }
        },
        {
          "no": 7,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "포인트 잡았으니 답 다시 골라볼게요",
          "focusQ": 0,
          "gate": "ifWrong",
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
          "no": 8,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 피드백",
          "tutor": "그렇죠. painting a picture이 사진 속 동작과 정확히 일치해요.",
          "focusQ": 0,
          "gate": "ifCorrect",
          "tutorIfWrong": "핵심 표현은 painting a picture, '그림을 그리고 있다'이니 사진 속 동작과 정확히 일치하죠!",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 9,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 피드백",
          "tutor": "맞아요! painting a picture이 사진 속 동작이랑 딱 맞죠.",
          "focusQ": 0,
          "gate": "ifWrong",
          "tutorIfWrong": "여기서는 B예요. painting a picture, '그림을 그리고 있다'가 사진 속 동작과 정확히 맞아요.",
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
          "no": 10,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 rinsing a paintbrush는 왜 오답인가요?",
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
            "prompt": "A의 rinsing a paintbrush는 왜 오답인가요?",
            "hint": "붓을 헹구는 동작이 아니어서요. 붓을 잡고 그림을 그리고 있어요."
          }
        },
        {
          "no": 11,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - A",
          "tutor": "맞아요. paintbrush가 보여도 동작이 다르면 오답!",
          "focusQ": 0,
          "tutorIfWrong": "rinse a paintbrush는 '붓을 헹구다'예요. 사진 속 여자는 붓을 헹구는 게 아니라 그림을 그리고 있죠.",
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
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 visiting an art gallery는 쉽게 제외할 수 있는 보기였죠. 왜 일치하지 않죠?",
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
            "kind": "subjective",
            "prompt": "C의 visiting an art gallery는 쉽게 제외할 수 있는 보기였죠. 왜 일치하지 않죠?",
            "hint": "미술관을 방문하는 게 아니라 그림을 그리고 있어서요."
          }
        },
        {
          "no": 13,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - C",
          "tutor": "맞아요. gallery는 그림 그리는 것과 관련된 장소기는 하지만 미술관에 방문한 것은 아니죠.",
          "focusQ": 0,
          "tutorIfWrong": "visiting an art gallery는 '미술관을 방문하고 있다'는 뜻이죠. 그림 그리는 것과 관련된 장소가 나왔다고 속으면 안 돼요.",
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
          "no": 14,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 holding a tube of paint는 사진과 뭐가 다르죠? 헷갈릴 수 있는 보기에요.",
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
            "kind": "subjective",
            "prompt": "D의 holding a tube of paint는 사진과 뭐가 다르죠?",
            "hint": "물감 튜브를 들고 있지 않아요."
          }
        },
        {
          "no": 15,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - D",
          "tutor": "정확해요. paint라는 단어만 듣고 정답으로 생각하면 안 돼요. 물감 튜브를 들고 있지 않으니 D도 제외!",
          "focusQ": 0,
          "tutorIfWrong": "holding a tube of paint는 '물감 튜브를 들고 있다'죠. 붓을 들고 있으니 D도 오답!",
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
          "no": 16,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S7 표현 정리",
          "tutor": "사람 사진은 동작 먼저! 이 기준만 딱 챙겨가세요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 17,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "사물 사진은 위치와 상태부터! 눈에 띄는 사물의 위치나 상태를 말해볼까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "subjective",
            "prompt": "사물 사진은 위치와 상태부터! 눈에 띄는 사물의 위치나 상태를 말해볼까요?",
            "hint": "신발이 바닥에 줄지어 놓여 있어요. / 옷들이 옷걸이에 걸려 있고 왼쪽에는 핸드백도 걸려 있어요. / 오른쪽 벽에 모자가 두 개 걸려 있어요."
          }
        },
        {
          "no": 18,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "학생 풀이",
          "tutor": "좋아요. 이제 사진을 가장 정확하게 설명하는 선택지 골라볼게요.",
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
          "no": 19,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "채점",
          "tutor": "정답이에요!",
          "focusQ": 1,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 20,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "채점",
          "tutor": "오답이에요. 위치와 상태부터 다시 잡고 한 번 더 풀어볼게요.",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 21,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "사진 속 사물들을 빠르게 파악하는 게 중요해요. 우선 옷걸이에 여러 벌의 옷이 걸려있고 왼쪽에는 핸드백이 걸려있어요. 바닥에는 신발이 여러 켤레 놓여있고 오른쪽 벽에는 모자가 두 개도 걸려 있네요.",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 22,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "그럼 A문장에서 정답을 확신한 핵심 표현은 뭐였어요?",
          "focusQ": 1,
          "gate": "ifCorrect",
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
            "kind": "subjective",
            "prompt": "그럼 A문장에서 정답을 확신한 핵심 표현은 뭐였어요?",
            "hint": "lined up on the floor"
          }
        },
        {
          "no": 23,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "자, 이제 답 다시 골라볼게요.",
          "focusQ": 1,
          "gate": "ifWrong",
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
          "no": 24,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 피드백",
          "tutor": "그렇죠. lined up on the floor이 신발의 위치와 상태에 정확히 맞아요.",
          "focusQ": 1,
          "gate": "ifCorrect",
          "tutorIfWrong": "핵심은 lined up on the floor, '바닥에 줄지어 놓여 있다'예요. 사진과 정확히 맞죠.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 25,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 피드백",
          "tutor": "맞아요! lined up on the floor가 사진과 일치해요.",
          "focusQ": 1,
          "gate": "ifWrong",
          "tutorIfWrong": "정답은 A예요. 신발이 바닥에 줄지어 놓여 있는 모습과 A가 정확히 연결돼요.",
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
          "no": 26,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 folded and stacked는 왜 틀렸죠?",
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
            "prompt": "B의 folded and stacked는 왜 틀렸죠?",
            "hint": "옷이 접혀서 쌓여 있지 않고 옷걸이에 걸려 있어요."
          }
        },
        {
          "no": 27,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - B",
          "tutor": "맞아요. 접히거나 쌓여있지 않죠. B 제외!",
          "focusQ": 1,
          "tutorIfWrong": "folded and stacked는 '접히고 쌓여 있다'는 뜻이에요. 옷은 접혀 쌓인 상태가 아니라 걸려 있어요.",
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
          "no": 28,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 A handbag has been left on top of a basket은 사진과 뭐가 다르죠?",
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
            "kind": "subjective",
            "prompt": "C의 A handbag has been left on top of a basket은 사진과 뭐가 다르죠?",
            "hint": "핸드백이 바구니 위에 있지 않아요. 옷걸이 왼쪽에 걸려 있어요."
          }
        },
        {
          "no": 29,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - C",
          "tutor": "정확해요. 이번엔 위치가 안 맞아요. 핸드백은 옷걸이에 걸려있죠.",
          "focusQ": 1,
          "tutorIfWrong": "has been left는 '놓여 있다', on top of a basket은 '바구니 위에'라는 의미죠. 그런데 핸드백은 바구니 위에 놓여 있지 않아요. 옷걸이에 걸려 있어요.",
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
          "no": 30,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 Hats are being stored는 왜 사진과 맞지 않을까요?",
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
            "prompt": "D의 Hats are being stored는 왜 사진과 맞지 않을까요?",
            "hint": "모자를 보관하는 동작이 진행 중이지 않아서요. 벽에 걸려있어요."
          }
        },
        {
          "no": 31,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - D",
          "tutor": "맞아요. being이 나오면 실제 동작이 진행 중인지 확인해야 해요. 모자는 벽에 걸려있는 상태니 적절하지 않아요.",
          "focusQ": 1,
          "tutorIfWrong": "are being stored는 '지금 보관되고 있는 중'이라는 뜻이에요. 모자는 있지만 벽에 걸려있고, 누군가 모자를 보관하는 동작은 진행되고 있진 않죠!",
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
          "no": 32,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S7 표현 정리",
          "tutor": "사물 사진은 위치 + 상태! 이 두 개부터 확인하면 돼요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 33,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번 사진 조금 까다로울 수 있어요. 화분들이 어디에 어떻게 놓여 있죠?",
          "focusQ": 2,
          "interaction": {
            "kind": "subjective",
            "prompt": "이번 사진 조금 까다로울 수 있어요. 화분들이 어디에 어떻게 놓여 있죠?",
            "hint": "선반 위에 줄지어 놓여 있어요."
          }
        },
        {
          "no": 34,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "학생 풀이",
          "tutor": "좋아요. 방금 본 위치와 상태를 기준으로 가장 잘 맞는 보기를 골라보세요.",
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
          "no": 35,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "채점",
          "tutor": "맞아요, D예요! 이번엔 상태 표현이 핵심이에요.",
          "focusQ": 2,
          "gate": "ifCorrect",
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
          "no": 36,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "채점",
          "tutor": "정답이 아니에요. 중요 포인트 잡고 한 번 더 볼게요.",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 37,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "사진에서 누군가 화분을 정리하는 동작이 보이나요, 아니면 이미 정리된 모습만 보이나요?",
          "focusQ": 2,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "choice",
            "prompt": "사진에서 누군가 화분을 정리하는 동작이 보이나요, 아니면 이미 정리된 모습만 보이나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "진행 중인 동작"
              },
              {
                "text": "이미 되어 있는 상태",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 38,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "여기서 답이 갈리는 포인트는 하나예요. 동작이 진행 중인지, 이미 되어 있는 상태인지. 이 사진은 어느쪽에 해당하나요?",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "여기서 답이 갈리는 포인트는 하나예요. 동작이 진행 중인지, 이미 되어 있는 상태인지. 이 사진은 어느쪽에 해당하나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "진행 중인 동작"
              },
              {
                "text": "이미 되어 있는 상태",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 39,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 피드백",
          "tutor": "맞아요. 지금 동작이 진행되고 있지 않고 이미 정리된 상태가 보여요.",
          "focusQ": 2,
          "gate": "ifCorrect",
          "tutorIfWrong": "누군가 화분을 옮기는 장면이 아니라, 화분들이 이미 선반에 줄지어 놓여 있는 모습이에요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 40,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 피드백",
          "tutor": "좋아요. 상태 제대로 잡았어요.",
          "focusQ": 2,
          "gate": "ifWrong",
          "tutorIfWrong": "사진에서는 동작이 진행되고 있지 않고 화분이 이미 선반에 줄지어 놓여 있어요. 이걸 기준으로 다시 볼게요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 41,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 D의 have been lined up이 사진과 맞아요.",
          "focusQ": 2,
          "gate": "ifCorrect",
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
          "no": 42,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "정답을 다시 골라보세요.",
          "focusQ": 2,
          "gate": "ifWrong",
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
          "stage": "S5 피드백",
          "tutor": "맞아요! have been lined up이 사진 속 상태와 일치해요.",
          "focusQ": 2,
          "gate": "ifWrong",
          "tutorIfWrong": "정답은 D예요. 화분들이 이미 선반에 줄지어 놓여 있는 상태가 D와 연결돼요.",
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
          "no": 44,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 are being watered가 왜 오답일까요?",
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
            "kind": "subjective",
            "prompt": "A의 are being watered가 왜 오답일까요?",
            "hint": "물을 주는 동작이 진행 중이지 않아서요."
          }
        },
        {
          "no": 45,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - A",
          "tutor": "맞아요. being이면 진행 중인 동작이 실제로 보여야 해요.",
          "focusQ": 2,
          "tutorIfWrong": "are being watered는 '지금 물을 받고 있는 중'이라는 뜻이에요. 하지만 물을 주는 동작은 안 보여요.",
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
          "no": 46,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - B",
          "tutor": "B에는 삽이란 뜻의 shovel이 등장하죠. 왜 틀렸을까요?",
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
            "prompt": "B에는 삽이란 뜻의 shovel이 등장하죠. 왜 틀렸을까요?",
            "hint": "사진에 삽이 보이지 않아서요."
          }
        },
        {
          "no": 47,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - B",
          "tutor": "맞아요. 사진에 일단 삽이 보이지 않죠. 'A를 B에 기대어 세우다'는 뜻의 prop A against B라는 표현 기억하세요.",
          "focusQ": 2,
          "tutorIfWrong": "shovel은 '삽', prop A against B는 'A를 B에 기대어 세우다', shed는 창고예요. 삽이 창고에 기대어 세워져 있다고 했는데 사진에는 삽 자체가 보이지 않아요.",
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
          "no": 48,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 Large leaves are scattered across the ground는 사진과 뭐가 다를까요?",
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
            "prompt": "C의 Large leaves are scattered across the ground는 사진과 뭐가 다를까요?",
            "hint": "잎이 바닥에 흩어져 있지 않아요."
          }
        },
        {
          "no": 49,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - C",
          "tutor": "정확해요. 앞쪽에 잎이 무성한 식물이 보일 뿐이죠.",
          "focusQ": 2,
          "tutorIfWrong": "scattered across the ground는 '바닥 여기저기에 흩어져 있다'는 뜻이에요. 큰 잎들이 바닥에 흩어져 있는 모습은 보이지 않아요.",
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
          "no": 50,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S7 표현 정리",
          "tutor": "being이면 진행 동작, have been lined up처럼 완료된 수동 표현은 보이는 상태! 연습을 통해 익숙해져 봅시다.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 82,
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
          "no": 51,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "사진 속 사람의 행동을 묘사해 볼까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "subjective",
            "prompt": "사진 속 사람의 행동을 묘사해 볼까요?",
            "hint": "- 남자가 있고 컵과 커피 머신이 보여요. - 남자가 컵을 집어 들고 있어요."
          }
        },
        {
          "no": 52,
          "stage": "S6 오답 제거 - A",
          "tutor": "좋아요. A에서 tie an apron은 '앞치마를 매다'라는 뜻이에요. 남자가 지금 앞치마를 매고 있는 중인가요?",
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
            "prompt": "좋아요. A에서 tie an apron은 '앞치마를 매다'라는 뜻이에요. 남자가 지금 앞치마를 매고 있는 중인가요?",
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
          "no": 53,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 pour A into B는 'A를 B 안에 붓다'라는 뜻이에요. pour beans into a coffee machine은 커피 머신 안에 원두를 붓는다는 의미죠. 사진 속 행동과 일치하나요?",
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
            "prompt": "B의 pour A into B는 'A를 B 안에 붓다'라는 뜻이에요. pour beans into a coffee machine은 커피 머신 안에 원두를 붓는다는 의미죠. 사진 속 행동과 일치하나요?",
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
          "no": 54,
          "stage": "S3 개념 코칭",
          "tutor": "사진에 앞치마나 커피 머신이 보여도, 현재 하고 있는 동작까지 같아야 정답이 될 수 있어요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 55,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 hand A to B는 'A를 B에게 건네다'는 뜻이어서 이 문장은 손님에게 음료를 건네고 있다는 의미예요. 남자가 handing a beverage to a customer 하고 있나요?",
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
            "prompt": "C의 hand A to B는 'A를 B에게 건네다'는 뜻이어서 이 문장은 손님에게 음료를 건네고 있다는 의미예요. 남자가 handing a beverage to a customer 하고 있나요?",
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
          "no": 56,
          "stage": "S5 정답 근거 연결 - D",
          "tutor": "마지막 D의 pick up은 '집어 들다'라는 뜻이에요. 남자의 실제 행동과 일치하나요?",
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
            "prompt": "마지막 D의 pick up은 '집어 들다'라는 뜻이에요. 남자의 실제 행동과 일치하나요?",
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
          "no": 57,
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
          "no": 58,
          "stage": "S7 표현 정리",
          "tutor": "표현 정리하고 갈게요. tie an apron은 '앞치마를 매다', pour A into B는 'A를 B 안에 붓다', hand A to B는 'A를 B에게 건네다', pick up은 '집어 들다'예요. 꼭 기억하세요!",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 59,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "보이는 사물의 위치와 상태를 말해 볼까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "subjective",
            "prompt": "보이는 사물의 위치와 상태를 말해 볼까요?",
            "hint": "- 소파와 테이블이 있고 벽에 그림이 걸려 있어요. - 테이블 위에는 책이나 잡지가 있고 화분도 보여요."
          }
        },
        {
          "no": 60,
          "stage": "S5 정답 근거 연결 - A",
          "tutor": "A의 artwork는 그림이나 작품 같은 미술품이고, hang on a wall은 '벽에 걸려 있다'라는 뜻이에요. 사진과 일치하나요?",
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
            "prompt": "A의 artwork는 그림이나 작품 같은 미술품이고, hang on a wall은 '벽에 걸려 있다'라는 뜻이에요. 사진과 일치하나요?",
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
          "no": 61,
          "stage": "S6 오답 제거 - B",
          "tutor": "A는 사진과 일치하지만 나머지 보기들도 확인해 볼게요. B의 reading materials는 책이나 잡지 같은 읽을거리예요. reading materials가 소파 위에 있나요, 테이블 위에 있나요?",
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
            "prompt": "A는 사진과 일치하지만 나머지 보기들도 확인해 볼게요. B의 reading materials는 책이나 잡지 같은 읽을거리예요. reading materials가 소파 위에 있나요, 테이블 위에 있나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "on a sofa"
              },
              {
                "text": "on a table",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 62,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 are being installed는 '지금 설치되고 있는 중'이라는 뜻이에요. 사진에서 창문이 설치되고 있는 중인가요?",
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
            "prompt": "C의 are being installed는 '지금 설치되고 있는 중'이라는 뜻이에요. 사진에서 창문이 설치되고 있는 중인가요?",
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
          "stage": "S3 개념 코칭",
          "tutor": "맞아요. 특히 is/are being p.p.가 나오면 그 사물이 사진에 있는지만 보는 게 아니라, 실제로 그 동작이 진행 중인지 확인해야 해요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 64,
          "stage": "S6 오답 제거 - D",
          "tutor": "D에서는 potted plants, 즉 화분에 심긴 식물들이 have fallen on the floor 바닥에 넘어져 있다고 했어요. 사진 속 화분은 어떤 상태인가요?",
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
            "prompt": "D에서는 potted plants, 즉 화분에 심긴 식물들이 have fallen on the floor 바닥에 넘어져 있다고 했어요. 사진 속 화분은 어떤 상태인가요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "넘어져 있음"
              },
              {
                "text": "세워져 있음",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 65,
          "stage": "S7 표현 정리",
          "tutor": "A만 미술품이 벽에 걸려 있는 모습을 정확하게 설명하니까 정답은 A예요. 이 문제에서는 사물의 존재뿐 아니라 위치와 상태까지 정확히 비교하는 것이 중요했어요. artwork는 '미술품', reading materials는 '읽을거리', be installed는 '설치되다'로 기억해두세요.",
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
          "no": 66,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "사진 속 두 사람이 취하고 있는 행동이나 자세를 묘사해 볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "subjective",
            "prompt": "사진 속 두 사람이 취하고 있는 행동이나 자세를 묘사해 볼까요?",
            "hint": "- 여자 두 명이 있고 유리 진열대와 쇼핑 카트가 보여요. - 한 여자는 진열대 쪽에 팔을 올리고 있어요."
          }
        },
        {
          "no": 67,
          "stage": "S6 오답 제거 - A",
          "tutor": "좋아요. 보기에서 one of the women이라고 했으니 둘 중 한 명만을 정확히 묘사하고 있으면 정답이에요. A의 reach into는 '~안으로 손을 뻗다'라는 뜻이에요. 한 여성이 쇼핑 카트 안으로 reach into 하고 있나요?",
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
            "prompt": "좋아요. 보기에서 one of the women이라고 했으니 둘 중 한 명만을 정확히 묘사하고 있으면 정답이에요. A의 reach into는 '~안으로 손을 뻗다'라는 뜻이에요. 한 여성이 쇼핑 카트 안으로 reach into 하고 있나요?",
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
          "stage": "S5 정답 근거 연결 - B",
          "tutor": "여성이 진열장 안으로 손을 뻗고 있죠. B에서는 resting her arm on a glass counter라고 했어요. 여기서 rest one's arm on ~은 '팔을 ~에 기대거나 올려두다'라는 뜻이에요. 사진 속 여성의 자세와 맞나요?",
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
            "prompt": "여성이 진열장 안으로 손을 뻗고 있죠. B에서는 resting her arm on a glass counter라고 했어요. 여기서 rest one's arm on ~은 '팔을 ~에 기대거나 올려두다'라는 뜻이에요. 사진 속 여성의 자세와 맞나요?",
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
          "no": 69,
          "stage": "S3 개념 코칭",
          "tutor": "좋아요. rest를 무조건 '쉬다'로만 보면 안 돼요. 'rest + 신체 부위 + on~' 처럼 쓰이면 '신체 부위를 ~에 기대거나 올려두다'라는 의미가 돼요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 70,
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
          "no": 71,
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
          "no": 72,
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
          "no": 73,
          "stage": "S7 표현 정리",
          "tutor": "reach into ~는 '~안으로 손을 뻗다', rest one's arm on ~은 '팔을 ~에 기대다', display case는 '진열장'이에요. 사람이 여러 명 나오면 각 사람의 행동과 자세를 각각 빠르게 확인해 보세요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 74,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "사진 속 사물의 배치를 중심으로 묘사해 볼까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "subjective",
            "prompt": "사진 속 사물의 배치를 중심으로 묘사해 볼까요?",
            "hint": "- 책상과 의자가 여러 개 있고 책상 사이에 칸막이가 있어요. - 쓰레기통도 있고 사무실처럼 보여요."
          }
        },
        {
          "no": 75,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 Trash bins are being emptied는 '쓰레기통들이 지금 비워지고 있는 중이다'라는 뜻이에요. 사진에 쓰레기통은 보이지만 실제로 비워지고 있나요?",
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
            "prompt": "A의 Trash bins are being emptied는 '쓰레기통들이 지금 비워지고 있는 중이다'라는 뜻이에요. 사진에 쓰레기통은 보이지만 실제로 비워지고 있나요?",
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
          "no": 76,
          "stage": "S3 개념 코칭",
          "tutor": "그렇죠. 사물이 존재하는 것과 그 동작이 실제로 진행되는 것은 달라요. 특히 is/are being p.p.는 그 동작이 진행 중인지 꼭 확인해야 해요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 77,
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
          "no": 78,
          "stage": "S5 정답 근거 연결 - C",
          "tutor": "C의 partition은 '칸막이'이고, be divided with ~는 '~로 나뉘어 있다'라는 뜻이에요. 사진에서 책상 공간이 partition으로 divide 되어 있나요?",
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
            "prompt": "C의 partition은 '칸막이'이고, be divided with ~는 '~로 나뉘어 있다'라는 뜻이에요. 사진에서 책상 공간이 partition으로 divide 되어 있나요?",
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
          "no": 79,
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
          "no": 80,
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
          "no": 81,
          "stage": "S7 표현 정리",
          "tutor": "이 문제에서 쓰인 along a wall은 '벽을 따라서', partition은 '칸막이', a stack of documents는 '서류 한 더미'라는 뜻이에요. 같이 기억하세요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        }
      ],
    },
    'RC-P5-08': {
      intro: {
        "script": "이번에는 Part 5에서 능동태와 수동태를 빠르게 구분하는 방법을 연습해 볼게요.\nPart 5는 보기를 하나씩 해석하기보다, 빈칸 앞뒤의 문장 구조를 먼저 보는 것이 중요해요.\n먼저 빈칸이 동사 자리인지 확인하고, 주어가 직접 행동하는지 아니면 행동을 받는지를 살펴볼 거예요.\n여기에 빈칸 뒤에 목적어가 있는지, by + 행위자 같은 표현이 있는지도 같이 확인하면 능동태와 수동태를 훨씬 쉽게 구분할 수 있어요. 그럼 첫 번째 유형부터 시작해 볼까요?",
        "points": [
          "주어가 동작을 하는지·받는지 보고 능동태와 수동태 구분하기",
          "목적어·시제·by 표현을 확인해 알맞은 동사 형태 고르기"
        ]
      },
      summary: [
        {
          "title": "Part 5 능동태·수동태 핵심 정리",
          "intro": "오늘 배운 내용 빠르게 정리해 볼게요. 빈칸에 들어갈 말을 채워서 문장을 소리 내어 말해 보세요!",
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
              "ko": "정확해요. 동사 뒤에 목적어가 바로 나오면 주어가 직접 행동하는 능동 구조인지 먼저 확인해 볼 수 있어요.",
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
          "intro": "마지막으로 오늘 문제에서 나온 토익 빈출 표현만 확인해 볼게요. 영어 표현을 보고 알맞은 뜻을 골라보세요.",
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
          "tutor": "빈칸과 함께 동사 표현을 만드는 be동사가 하나 있어요. 동그라미 쳐볼까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "mark",
            "prompt": "빈칸과 함께 동사 표현을 만드는 be동사가 하나 있어요. 동그라미 쳐볼까요?",
            "targetWords": [
              "are"
            ]
          }
        },
        {
          "no": 2,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "학생 풀이",
          "tutor": "좋아요. 이제 먼저 한번 풀어볼게요.",
          "focusQ": 0,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 0
          }
        },
        {
          "no": 3,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "채점",
          "tutor": "맞아요, B예요! 답을 가른 포인트만 딱 볼게요.",
          "focusQ": 0,
          "gate": "ifCorrect",
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
          "no": 4,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "채점",
          "tutor": "정답이 아니에요. 같이 한번 봐볼게요. 여기서 주어 역할만 잡으면 답이 보여요.",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 5,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭",
          "tutor": "보기의 standardize는 '표준화하다'는 뜻이에요. 이 문장에서 주어가 표준화하는 쪽일까요, 표준화되는 대상일까요?",
          "focusQ": 0,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "choice",
            "prompt": "보기의 standardize는 '표준화하다'는 뜻이에요. 이 문장에서 주어가 표준화하는 쪽일까요, 표준화되는 대상일까요?",
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
          "no": 6,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭",
          "tutor": "보기의 standardize는 '표준화하다'는 뜻이고 주어의 핵심 부분은 All component parts예요. 이 부품들이 직접 표준화하는 쪽일까요, 표준화되는 대상일까요?",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "보기의 standardize는 '표준화하다'는 뜻이고 주어의 핵심 부분은 All component parts예요. 이 부품들이 직접 표준화하는 쪽일까요, 표준화되는 대상일까요?",
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
          "no": 7,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 피드백",
          "tutor": "정확해요. 부품은 표준화되는 대상! 그래서 수동으로 가면 돼요.",
          "focusQ": 0,
          "tutorIfWrong": "부품이 직접 표준화하는 게 아니라 표준화되는 대상이죠. 그래서 standardize를 수동태인 be + p.p. 형태로 써야 해요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 8,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 수동태 형태인 B로 'are standardized'가 되어야 해요.",
          "focusQ": 0,
          "gate": "ifCorrect",
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
          "no": 9,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "이 기준으로 답 다시 골라볼게요.",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 0
          }
        },
        {
          "no": 10,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 피드백",
          "tutor": "맞아요! 주어 역할 잡으니까 B로 바로 좁혀지죠.",
          "focusQ": 0,
          "gate": "ifWrong",
          "tutorIfWrong": "여기서는 B예요. '표준화되다'의 의미가 되어야 하니 수동태인 are standardized가 맞아요.",
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
          "no": 11,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 are standardizing은 왜 틀릴까요?",
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
            "prompt": "A의 are standardizing은 왜 틀릴까요?",
            "hint": "부품이 표준화하는 의미가 돼서요."
          }
        },
        {
          "no": 12,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - A",
          "tutor": "능동태는 쓸 수 없죠. A 제외!",
          "focusQ": 0,
          "tutorIfWrong": "are standardizing은 '표준화하고 있다'예요. 그러면 부품이 직접 행동하는 주체가 돼서 이 문장과 안 맞아요.",
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
          "no": 13,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - C",
          "tutor": "C 볼게요. are standardizes로 쓸 수 있나요?",
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
            "prompt": "C 볼게요. are standardizes로 쓸 수 있나요?",
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
          "no": 14,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - C",
          "tutor": "are과 standardizes는 바로 이어서 쓸 수 없죠. C는 바로 빼고 갈게요.",
          "focusQ": 0,
          "tutorIfWrong": "standardizes는 그 자체로 현재형 동사라 앞의 are와 바로 이어 쓸 수 없어요. C는 바로 제외!",
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
          "stage": "S6 오답 제거 - D",
          "tutor": "마지막 D예요. standardization은 어떤 품사죠?",
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
            "prompt": "마지막 D예요. standardization은 어떤 품사죠?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "동사"
              },
              {
                "text": "명사",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 16,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - D",
          "tutor": "be동사 + 명사 구조 자체는 가능하지만, 여기서는 부품들이 '표준화되어 있다'는 의미가 필요하므로 D는 맞지 않아요.",
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
          "no": 17,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S7 표현 정리",
          "tutor": "be동사 + -ing 혹은 p.p.가 보기로 나오면 주어 역할까지 확인! 주어가 행동을 받는 쪽이면 be + p.p.예요. 이 포인트만 딱 챙겨가세요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 18,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞에서 '~할 수 없다'는 뜻의 조동사가 하나 있어요. 동그라미 쳐볼까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "mark",
            "prompt": "빈칸 앞에서 '~할 수 없다'는 뜻의 조동사가 하나 있어요. 동그라미 쳐볼까요?",
            "targetWords": [
              "cannot"
            ]
          }
        },
        {
          "no": 19,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "학생 풀이",
          "tutor": "좋아요. 조동사 참고해서 먼저 한번 풀어볼게요.",
          "focusQ": 1,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 1
          }
        },
        {
          "no": 20,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "채점",
          "tutor": "정답이에요! 포인트 딱딱 짚고 넘어갈게요.",
          "focusQ": 1,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 21,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "채점",
          "tutor": "정답이 아니에요. 하나씩 같이 봐볼게요.",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 22,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "주어인 settings가 직접 변경하는 쪽일까요, 변경되는 대상일까요?",
          "focusQ": 1,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "choice",
            "prompt": "주어인 settings가 직접 변경하는 쪽일까요, 변경되는 대상일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "변경하는 쪽"
              },
              {
                "text": "변경되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 23,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "빈칸 뒤에 by any user가 있죠. settings가 사용자를 변경하는 걸까요, 사용자에 의해 변경되는 걸까요?",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "빈칸 뒤에 by any user가 있죠. settings가 사용자를 변경하는 걸까요, 사용자에 의해 변경되는 걸까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "변경하는 쪽"
              },
              {
                "text": "변경되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 24,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 피드백",
          "tutor": "정확해요. settings는 변경되는 대상! 그래서 수동으로 가면 돼요.",
          "focusQ": 1,
          "gate": "ifCorrect",
          "tutorIfWrong": "settings가 직접 무언가를 변경하는 게 아니라 사용자에 의해 변경되는 대상이죠. 조동사 뒤에서 수동태를 만들려면 be + p.p.가 필요해요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 25,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 피드백",
          "tutor": "좋아요. 변경되는 대상이면 수동! 방향 잡았어요.",
          "focusQ": 1,
          "gate": "ifWrong",
          "tutorIfWrong": "by any user가 힌트예요. settings는 행동하는 쪽이 아니라 변경되는 대상이니까 수동태가 필요해요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 26,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 수동태를 만드는 D, cannot be altered가 되어야 해요.",
          "focusQ": 1,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 27,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "자, 이제 답 다시 골라볼게요.",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 1
          }
        },
        {
          "no": 28,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 피드백",
          "tutor": "맞아요! 변경되는 대상이라는 걸 잡으니까 D로 좁혀지죠.",
          "focusQ": 1,
          "gate": "ifWrong",
          "tutorIfWrong": "여기서는 D예요. settings가 변경되는 대상이니까 cannot + be altered로 수동태를 만들어야 해요.",
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
          "no": 29,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 cannot to alter은 왜 틀릴까요?",
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
            "kind": "subjective",
            "prompt": "A의 cannot to alter은 왜 틀릴까요?",
            "hint": "조동사 뒤에는 동사원형이 와야 해서요."
          }
        },
        {
          "no": 30,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - A",
          "tutor": "맞아요. 조동사 뒤에 to는 붙이지 않죠. A는 바로 제외!",
          "focusQ": 1,
          "tutorIfWrong": "cannot 같은 조동사 뒤에는 동사원형이 바로 와야 해요. to alter은 올 수 없으니 A는 제외예요.",
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
          "no": 31,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 cannot alter은 형태상 가능하죠. 그런데 이 문장에서는 왜 안 맞을까요?",
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
            "prompt": "B의 cannot alter은 형태상 가능하죠. 그런데 이 문장에서는 왜 안 맞을까요?",
            "hint": "settings가 직접 변경하는 의미가 돼서요."
          }
        },
        {
          "no": 32,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - B",
          "tutor": "정확해요. 형태는 가능하지만 이 문장에서 능동태는 의미상 적절하지 않죠.",
          "focusQ": 1,
          "tutorIfWrong": "cannot alter이면 settings가 직접 무언가를 변경할 수 없다는 능동 의미가 돼요. 여기서는 settings는 변경되는 대상이니까 맞지 않아요.",
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
          "stage": "S6 오답 제거 - C",
          "tutor": "C 볼게요. cannot altering으로 쓸 수 있나요?",
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
            "prompt": "C 볼게요. cannot altering으로 쓸 수 있나요?",
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
          "no": 34,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - C",
          "tutor": "맞아요. 조동사 뒤에 -ing는 바로 올 수 없어요. C도 제외!",
          "focusQ": 1,
          "tutorIfWrong": "조동사 뒤 altering은 ing형이라 그대로 올 수 없으니 C는 오답이에요.",
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
          "stage": "S7 표현 정리",
          "tutor": "조동사 보이면 뒤에는 동사원형! 그리고 주어가 행동을 받는 쪽이면 조동사 + be + p.p.로 수동태를 만들어요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 36,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 바로 뒤에 동사의 대상이 되는 표현이 있어요. 동그라미 쳐볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "mark",
            "prompt": "빈칸 바로 뒤에 동사의 대상이 되는 표현이 있어요. 동그라미 쳐볼까요?",
            "targetWords": [
              "team"
            ]
          }
        },
        {
          "no": 37,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "학생 풀이",
          "tutor": "좋아요. 이 단서 먼저 잡고 한번 풀어볼게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 2
          }
        },
        {
          "no": 38,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "채점",
          "tutor": "맞아요, A예요! 중요한 부분 확인해 볼게요.",
          "focusQ": 2,
          "gate": "ifCorrect",
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
          "stage": "채점",
          "tutor": "정답이 아니에요. 같이 한번 볼게요. 먼저 능동인지 수동인지부터 잡아볼게요.",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 40,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "Ms. Levy는 팀에게 지시하는 사람일까요, 지시를 받는 사람일까요?",
          "focusQ": 2,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "choice",
            "prompt": "Ms. Levy는 팀에게 지시하는 사람일까요, 지시를 받는 사람일까요?",
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
          "no": 41,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "주어는 Ms. Levy, 빈칸 뒤에는 목적어 the team이 있어요. Ms. Levy는 팀에게 지시하는 사람일까요, 지시를 받는 사람일까요?",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "주어는 Ms. Levy, 빈칸 뒤에는 목적어 the team이 있어요. Ms. Levy는 팀에게 지시하는 사람일까요, 지시를 받는 사람일까요?",
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
          "no": 42,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 피드백",
          "tutor": "정확해요. Ms. Levy가 지시하는 주체! 그래서 능동태가 필요해요.",
          "focusQ": 2,
          "gate": "ifCorrect",
          "tutorIfWrong": "빈칸 뒤의 the team은 지시를 받는 대상이에요. 즉, Ms. Levy가 직접 팀에게 지시하는 구조라 능동태가 필요해요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 43,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 피드백",
          "tutor": "좋아요. 하는 쪽이면 능동! 핵심 잡았어요.",
          "focusQ": 2,
          "gate": "ifWrong",
          "tutorIfWrong": "Ms. Levy가 팀에게 지시하는 주체이므로 수동태가 아니라 능동태가 필요해요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 44,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 시제 확인",
          "tutor": "이제 시제 하나만 더 볼게요. 앞의 when절에서 과거를 나타내는 표현을 찾아 밑줄 쳐볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "mark",
            "prompt": "이제 시제 하나만 더 볼게요. 앞의 when절에서 과거를 나타내는 표현을 찾아 밑줄 쳐볼까요?",
            "targetWords": [
              "took"
            ]
          }
        },
        {
          "no": 45,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 피드백",
          "tutor": "맞아요. took over가 과거 사건을 보여주죠. when절 뒤도 같은 과거 상황을 설명하고 있어요.",
          "focusQ": 2,
          "tutorIfWrong": "took over가 과거형이에요. 프로젝트를 맡았던 당시의 일을 설명하고 있으니 빈칸도 과거형이 자연스러워요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 46,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 능동 + 과거를 모두 만족하는 A, directed가 정답이에요.",
          "focusQ": 2,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 47,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "좋아요. 능동이고 과거여야 한다, 이 두 기준으로 답 다시 골라볼게요.",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 2
          }
        },
        {
          "no": 48,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 피드백",
          "tutor": "맞아요! 능동 + 과거, 두 조건을 잡으니까 A로 좁혀지죠.",
          "focusQ": 2,
          "gate": "ifWrong",
          "tutorIfWrong": "여기서는 A예요. Ms. Levy가 팀에게 지시하는 주체이고, 과거 상황이므로 directed가 맞아요.",
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
          "no": 49,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 direct는 왜 오답일까요?",
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
            "prompt": "B의 direct는 왜 오답일까요?",
            "hint": "과거형이 아니라서요."
          }
        },
        {
          "no": 50,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - B",
          "tutor": "맞아요. 형태는 능동이지만 과거 시제가 아니죠. B는 오답이에요.",
          "focusQ": 2,
          "tutorIfWrong": "direct는 동사원형이에요. 여기서는 과거에 있었던 일을 나타내야 하므로 directed가 필요해요.",
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
          "no": 51,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 is directing은 왜 적절하지 않을까요?",
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
            "prompt": "C의 is directing은 왜 적절하지 않을까요?",
            "hint": "현재진행형이라 시제가 안 맞아요."
          }
        },
        {
          "no": 52,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - C",
          "tutor": "정확해요. 시제가 안 맞으니 C도 빼고 갈게요.",
          "focusQ": 2,
          "tutorIfWrong": "is directing은 현재진행형이에요. 앞의 took over가 보여주는 과거 상황과 맞지 않아서 C는 아니에요.",
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
          "no": 53,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - D",
          "tutor": "마지막 D예요. was directed를 넣으면 Ms. Levy가 지시하는 사람이 되나요, 지시 받는 사람이 되나요?",
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
            "prompt": "마지막 D예요. was directed를 넣으면 Ms. Levy가 지시하는 사람이 되나요, 지시 받는 사람이 되나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "지시하는 사람"
              },
              {
                "text": "지시받는 사람",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 54,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - D",
          "tutor": "맞아요. 그래서 적절하지 않죠. D도 제외!",
          "focusQ": 2,
          "tutorIfWrong": "수동태는 들어갈 수 없죠. 능동태가 필요해요.",
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
          "no": 55,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S7 표현 정리",
          "tutor": "빈칸 뒤 목적어가 보이면 능동 가능성부터 확인! 그 다음에 시제까지 체크하세요. direct A to부정사는 'A에게 ~하도록 지시하다', take over는 '맡다·인수하다'는 뜻이니 같이 기억하세요.",
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
          "no": 56,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S2 유형·역할 판별",
          "tutor": "먼저 주어부터 잡을게요. of 뒤 설명은 잠깐 빼고, 주어의 핵심 부분에 동그라미 쳐볼까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "mark",
            "prompt": "먼저 주어부터 잡을게요. of 뒤 설명은 잠깐 빼고, 주어의 핵심 부분에 동그라미 쳐볼까요?",
            "targetWords": [
              "layout"
            ]
          }
        },
        {
          "no": 57,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "학생 풀이",
          "tutor": "그렇죠. 주어 잡았으니 먼저 한번 풀어볼게요.",
          "focusQ": 3,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 3
          }
        },
        {
          "no": 58,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "채점",
          "tutor": "맞아요, C예요! 포인트 짚고 넘어가 볼게요.",
          "focusQ": 3,
          "gate": "ifCorrect",
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
          "no": 59,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "채점",
          "tutor": "같이 한번 볼게요. layout이 하는 쪽인지, 받는 쪽인지부터 파악해봅시다.",
          "focusQ": 3,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 60,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S3 개념 코칭",
          "tutor": "주어인 The layout은 직접 무언가를 설계할까요, 누군가에 의해 설계되는 대상일까요?",
          "focusQ": 3,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "choice",
            "prompt": "주어인 The layout은 직접 무언가를 설계할까요, 누군가에 의해 설계되는 대상일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "직접 설계하는 쪽"
              },
              {
                "text": "설계되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 61,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S3 개념 코칭",
          "tutor": "주어의 핵심 부분은 The layout이에요. 배치가 직접 무언가를 설계할까요, 아니면 누군가에 의해 설계되는 대상일까요?",
          "focusQ": 3,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "주어의 핵심 부분은 The layout이에요. 배치가 직접 무언가를 설계할까요, 아니면 누군가에 의해 설계되는 대상일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "직접 설계하는 쪽"
              },
              {
                "text": "설계되는 대상",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 62,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S3 피드백",
          "tutor": "정확해요. 그래서 수동태가 필요해요.",
          "focusQ": 3,
          "gate": "ifCorrect",
          "tutorIfWrong": "layout은 누군가에 의해 설계되는 대상이죠. 그래서 design을 수동태로 써야 해요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 63,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S3 피드백",
          "tutor": "좋아요. 받는 쪽이면 수동! 방향 잡았어요.",
          "focusQ": 3,
          "gate": "ifWrong",
          "tutorIfWrong": "핵심은 주어 역할이에요. layout은 행동하는 주체가 아니라 설계되는 대상이므로 수동태가 필요해요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 64,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S5 정답 근거 연결",
          "tutor": "설계되는 과정이 진행 중이라는 의미를 만드는 C, is being designed가 맞아요.",
          "focusQ": 3,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 65,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S5 정답 근거 연결",
          "tutor": "이 기준으로 답 다시 골라볼게요.",
          "focusQ": 3,
          "gate": "ifWrong",
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 3
          }
        },
        {
          "no": 66,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S5 피드백",
          "tutor": "맞아요! 주어 역할을 잡으니까 C로 좁혀지죠.",
          "focusQ": 3,
          "gate": "ifWrong",
          "tutorIfWrong": "여기서는 C예요. 수동이면서 현재 설계가 진행 중이므로 is being designed가 적절해요.",
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
          "no": 67,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 designs는 왜 오답일까요?",
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
            "kind": "subjective",
            "prompt": "A의 designs는 왜 오답일까요?",
            "hint": "layout이 직접 설계하는 의미가 돼서요."
          }
        },
        {
          "no": 68,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 피드백 - A",
          "tutor": "맞아요. designs면 layout이 직접 설계한다는 의미가 되죠. A는 제외!",
          "focusQ": 3,
          "tutorIfWrong": "designs는 '직접 설계한다'는 능동 의미예요. A는 맞지 않아요.",
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
          "no": 69,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 was designing은 능동형이죠. 이걸 넣으면 주어가 어떤 역할이 될까요?",
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
            "kind": "choice",
            "prompt": "B의 was designing은 능동형이죠. 이걸 넣으면 주어가 어떤 역할이 될까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "설계하는 쪽",
                "correct": true
              },
              {
                "text": "설계되는 쪽"
              }
            ]
          }
        },
        {
          "no": 70,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 피드백 - B",
          "tutor": "맞아요. 그러니 적절하지 않죠.",
          "focusQ": 3,
          "tutorIfWrong": "was designing은 '설계하고 있었다'는 능동 진행형이에요. 이걸 넣으면 layout이 직접 설계하는 주체가 되어 의미가 맞지 않죠.",
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
          "no": 71,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 오답 제거 - D",
          "tutor": "마지막 D예요. designed만 넣어서 수동태를 완성할 수 있을까요?",
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
            "prompt": "마지막 D예요. designed만 넣어서 수동태를 완성할 수 있을까요?",
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
          "no": 72,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 피드백 - D",
          "tutor": "맞아요. 수동태라면 앞에 be동사가 필요하죠. D도 제외!",
          "focusQ": 3,
          "tutorIfWrong": "수동태는 be + p.p. 형태가 필요해요. 이 자리에서 designed만 쓰면 수동태가 완성되지 않아요.",
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
          "no": 73,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S7 표현 정리",
          "tutor": "주어가 행동을 받는 대상이면 수동태 be + p.p! 그리고 행동을 받는 과정이 진행 중이면 be + being + p.p.를 써요. 그리고 이 문장에서.input은 '의견이나 조언'이라는 뜻이니 단어 뜻 기억하세요!",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 110,
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
          "no": 74,
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
          "no": 75,
          "stage": "S3 개념 코칭",
          "tutor": "맞아요. will be가 있으니까 미래 시제이고, 주어가 행동을 받는다면 will be p.p. 형태의 미래 수동태를 만들어야 해요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 76,
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
          "no": 77,
          "stage": "S6 오답 제거",
          "tutor": "입장료는 누군가를 면제하는 게 아니라 면제되는 대상이죠. 그래서 will be 뒤에는 수동태를 완성하는 과거분사 p.p.가 필요해요. (A) waives는 3인칭 단수 현재형이라 will be 뒤에 올 수 없고, (B) waiving은 ing형이라 넣으면 수동태가 완성되지 않아요. (D) waivers는 '면제'라는 뜻의 명사라 여기서 필요한 과거분사 자리에 올 수 없어요. 그러면 will be p.p. 형태를 완성하는 보기는 무엇일까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 0
          }
        },
        {
          "no": 78,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. the entry fee will be waived는 '입장료가 면제될 것이다'라는 뜻이라 문맥에도 잘 맞아요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 79,
          "stage": "S7 표현 정리",
          "tutor": "이 문제는 will be를 보고 미래 수동태 자리를 빠르게 잡은 뒤, entry fee가 '면제되는 대상'인지 의미까지 확인하는 게 핵심이에요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 80,
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
          "no": 81,
          "stage": "S3 개념 코칭",
          "tutor": "appoint A as B는 'A를 B로 임명하다'라는 표현이에요. 반대로 A가 주어로 나오면 A be appointed as B, 즉 'A가 B로 임명되다'라는 수동태 형태를 사용해요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 82,
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
          "no": 83,
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
          "no": 84,
          "stage": "S4 추가 설명",
          "tutor": "잘 찾았어요. yesterday가 있으니까 시제는 과거로 가야 해요. 결국 이 문장에는 과거 + 수동태라는 두 조건이 필요합니다.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 85,
          "stage": "S6 오답 제거",
          "tutor": "이제 보기를 볼게요. (B) appoints는 현재 능동형이고, (C) is appointing도 현재 진행 능동형이에요. (D) appointed는 과거 능동형이고 수동태로 쓰려면 앞에 be동사가 필요해요. 그럼 과거이면서 수동태인 보기는 무엇일까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 1
          }
        },
        {
          "no": 86,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. was appointed as the editor-in-chief는 '편집장으로 임명되었다'라는 뜻이에요. 문장 전체는 'Romesh Sastry가 어제 Garrison Herald 신문의 편집장으로 임명되었다'가 되니까 구조와 의미가 모두 자연스럽습니다.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 87,
          "stage": "S7 표현 정리",
          "tutor": "이 문제에서는 appoint A as B는 'A를 B로 임명하다'이고 이를 수동태로 바꾼 A be appointed as B는 'A가 B로 임명되다'가 된다는 것을 기억해 주세요. 그리고 목적어가 필요한 동사인데 빈칸 뒤에 목적어가 없다면 수동태가 필요한지 확인해야 하고 yesterday처럼 명확한 시제 단서도 함께 보는 것이 중요해요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 88,
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
          "no": 89,
          "stage": "S3 개념 코칭",
          "tutor": "잘 찾았어요. 전문 목수에 의해서 라는 뜻의 'by expert carpenters'는 누가 행동 하는지 알려주는 표현이에요. 이렇게 by + 행위자가 나오면 수동태가 적절할지 먼저 확인해 보면 좋아요. 다만 by만 보고 바로 결정하지 말고, 주어가 실제로 행동을 받는 대상인지도 함께 확인해야 해요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 90,
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
          "no": 91,
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
          "no": 92,
          "stage": "S6 오답 제거",
          "tutor": "좋아요. 이제 보기를 볼게요. (A) assemble은 제품들이 직접 조립한다는 현재 능동형이 되어 의미가 맞지 않아요. (B) assembled는 과거분사로 쓸 수 있지만, 앞에 be동사가 없어서 여기서는 수동태를 완성하지 못해요. (C) are assembling은 '제품들이 조립하고 있다'라는 능동 진행형이고요. 그러면 are p.p.로 수동태를 완성하는 보기는 무엇일까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 2
          }
        },
        {
          "no": 93,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. products are assembled by expert carpenters는 '제품들이 전문 목수들에 의해 조립된다'라는 뜻이에요. 주어가 행동을 받는다는 점과 by + 행위자까지 모두 잘 맞죠.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 94,
          "stage": "S7 표현 정리",
          "tutor": "이 문제에서는 by + 행위자를 수동태의 중요한 단서로 활용하되, 주어가 실제로 행동을 받는 대상인지까지 확인하는 것이 핵심이에요. assemble은 '조립하다', carpenter는 '목수', piece by piece는 '하나씩, 한 부분씩'이라는 뜻이니 함께 기억해둬요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 95,
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
          "no": 96,
          "stage": "S3 개념 코칭",
          "tutor": "잘 찾았어요. 빈칸 바로 뒤에 Mr. Stepp's duties라는 목적어가 이어지고 있죠. assume은 '추정하다'라는 뜻도 있지만, assume duties라고 하면 '업무를 맡다'라는 뜻이에요. 이렇게 동사 뒤에 목적어가 바로 이어지면, 주어가 직접 행동하는 능동태인지 먼저 확인해 보면 좋아요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 97,
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
          "no": 98,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요. 그러면 능동태가 필요해요. 이번에는 뒤의 while he is at a weeklong marketing seminar를 볼게요. Mr. Stepp이 세미나에 있는 동안 Ms. Chin이 그의 업무를 맡게 되는 상황이에요. 앞으로 맡게 될 일이면 과거형과 미래형 중 어느 쪽이 더 자연스러울까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "맞아요. 그러면 능동태가 필요해요. 이번에는 뒤의 while he is at a weeklong marketing seminar를 볼게요. Mr. Stepp이 세미나에 있는 동안 Ms. Chin이 그의 업무를 맡게 되는 상황이에요. 앞으로 맡게 될 일이면 과거형과 미래형 중 어느 쪽이 더 자연스러울까요?",
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
          "no": 99,
          "stage": "S4 추가 설명",
          "tutor": "좋아요. while 같은 시간절에서는 앞으로의 일을 말하더라도 is처럼 현재형을 쓸 수 있어요. while he is ...가 있다고 해서 주절까지 현재형이어야 하는 건 아니고, 이 문장의 주절에서는 Ms. Chin이 그 기간 동안 업무를 맡게 될 것이므로 미래형이 자연스러워요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 100,
          "stage": "S6 오답 제거",
          "tutor": "이제 보기를 볼게요. (A) assumed는 과거형이라 뒤의 현재 시점과 이어지는 상황에 맞지 않아요. (B) to assume은 to부정사라 이 문장의 주동사 자리를 혼자 완성할 수 없어요. (C) is assumed는 수동태라 'Ms. Chin이 ~라고 여겨진다'는 식의 구조가 되어 뒤의 duties와도 맞지 않고요. 그러면 능동태이면서 앞으로의 일을 나타낼 수 있는 보기는 무엇일까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 3
          }
        },
        {
          "no": 101,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. Ms. Chin will assume Mr. Stepp's duties는 'Ms. Chin이 Mr. Stepp의 업무를 맡게 될 것이다'라는 뜻이에요. 뒤의 '그가 일주일간 세미나에 있는 동안'이라는 내용과도 자연스럽게 연결됩니다.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 102,
          "stage": "S7 표현 정리",
          "tutor": "이 문제에서는 동사 뒤에 목적어가 바로 있으면 능동태인지 먼저 확인하는 것이 중요했어요. assume duties는 '업무를 맡다'라는 표현으로 꼭 기억해두고요. 또 while 같은 시간절은 미래 상황을 말할 때도 현재형을 쓸 수 있음을 알아두세요!",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 103,
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
          "no": 104,
          "stage": "S3 개념 코칭",
          "tutor": "맞아요. that은 앞의 the building을 이어서 설명하고 있어요. 그럼 이제 이 건물이 직접 무언가를 하는지, 아니면 어떤 행동을 받는지 확인해 볼게요.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 105,
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
          "no": 106,
          "stage": "S4 추가 설명",
          "tutor": "맞아요. 건물이 스스로 다른 것을 건설하는 게 아니라 누군가가 건물을 건설하는 것이죠. 따라서 that 뒤에는 능동태가 아니라 수동태가 필요해요. 즉 be + p.p 형태가 완성되어야 합니다.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 107,
          "stage": "S6 오답 제거",
          "tutor": "이제 보기를 하나씩 볼게요. (A) is constructing은 '건설하고 있다'라는 능동 진행형이라 건물이 직접 무언가를 건설하는 뜻이 돼요. (B) constructed는 여기서 능동 과거형으로 쓰이면 '건물이 무언가를 건설했다'는 구조가 되어 맞지 않고, 수동태로 쓰려면 앞에 be동사가 필요해요. (D) has constructed도 '건물이 무언가를 건설해왔다'라는 현재완료 능동형이고요. 그러면 건물이 건설된 대상이라는 의미를 만드는 수동태는 어떤 보기인가요?",
          "focusQ": 4,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 4
          }
        },
        {
          "no": 108,
          "stage": "S5 정답 근거 연결",
          "tutor": "맞아요. the building that was constructed는 '건설된 건물'이라는 뜻이에요. 그래서 전체적으로는 '건축가의 설계 도면이 실제로 건설된 건물과 크게 다르다'라는 의미가 되어 문맥에도 잘 맞습니다.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 109,
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
        "script": "오늘은 토익 시험에서 제일 먼저 만나게 될 Part 1, 사람과 사물 사진이 나오는 문제를 공부해볼 거예요. 가장 쉬워보이지만, 간혹 어려운 문제가 나오면 만점 받기 쉽지 않기도 해요. Part 1 공부의 핵심은 인물과 사물의 동작과 상태를 나타내는 표현 외우기예요! [curious] 자, 이제 수업하러 가볼까요?",
        "points": [
          "사람은 '무엇을 하는지' 먼저 보기",
          "사물은 '어디에 어떤 상태인지' 먼저 보기",
          "사진과 다른 동작·사물·위치 빠르게 지우기"
        ]
      },
      summary: [
        {
          "title": "Part 1 사람·사물 사진 핵심 정리",
          "intro": "오늘 배운 내용 빠르게 정리해볼게요. [excited] 빈칸에 들어갈 말을 채워서 문장을 소리 내어 말해 보세요!",
          "items": [
            {
              "id": "s1_1",
              "en": "인물이 '지금 ~하고 있다'는 동작은 주로 ___ 형태로 표현한다.",
              "ko": "그렇죠. is painting, is holding처럼 인물이 지금 하고 있는 동작은 be + -ing 형태로 자주 나와요.",
              "answer": "be + -ing",
              "choices": [],
              "keywords": [
                "be + -ing",
                "비 아이엔지",
                "비잉",
                "be ing",
                "be -ing"
              ]
            },
            {
              "id": "s1_2",
              "en": "사물이 이미 어떤 상태로 놓여 있을 때 be + p.p.나 ___ 형태가 자주 나오고, 사물에 어떤 동작이 진행되는 중일 때는 ___ 형태가 나온다.",
              "ko": "맞아요. have been lined up처럼 'have/has been + p.p.'는 사물이 이미 어떤 상태로 놓여 있을 때 자주 나오고, are being installed처럼 'be being + p.p.'는 누군가에 의해 사물이 놓이는 중일 때 써요.",
              "answer": "have(has) been + p.p.",
              "choices": [],
              "keywords": [
                "have(has) been + p.p.",
                "해브 빈 피피",
                "해브빈 피피",
                "해브 빈 피 피",
                "해브 해즈 빈 피피",
                "해브해즈 빈 피피",
                "헤브 빈 피피",
                "have has been pp",
                "have been pp"
              ],
              "blanks": [
                {
                  "answer": "have(has) been + p.p.",
                  "keywords": [
                    "have(has) been + p.p.",
                    "해브 빈 피피",
                    "해브빈 피피",
                    "해브 빈 피 피",
                    "해브 해즈 빈 피피",
                    "해브해즈 빈 피피",
                    "헤브 빈 피피",
                    "have has been pp",
                    "have been pp"
                  ]
                },
                {
                  "answer": "be being + p.p.",
                  "keywords": [
                    "be being + p.p.",
                    "비 비잉 피피",
                    "비빙 피피",
                    "비 빙 피피",
                    "비 비잉 피 피",
                    "be being pp"
                  ]
                }
              ]
            },
            {
              "id": "s1_3",
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
          "intro": "마지막으로 오늘 문제에서 나온 토익 빈출 표현을 확인해볼게요. [excited] 영어 표현을 보고 알맞은 뜻을 골라보세요.",
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
      practiceOutro: "실전처럼 잘 풀었나요? [whispers] {전체수} 문제 중 {맞은수} 문제 맞혔어요. [excited] 틀린 문제 한번 같이 볼게요.",
      turns: [
        {
          "no": 1,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (1)",
          "tutor": "Part 1에서 나오는 사진 유형은 뭐지? 인물이 등장하거나, 아니면 사물과 풍경만 나오는 사진이거나. 딱 두 개만 나오죠. 그래서 사람이 뭘 하는지, 사물이 어디에 어떻게 있는지, 잘 듣고 빨리 사진이랑 비교하면 돼요. 그럼 이런 문제 푸는데 제일 많이 나오는 표현. [excited] 진행 표현이랑 수동 표현을 같이 봅시다.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 2,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (2)",
          "tutor": "인물이 '지금 ~하고 있다' 이런 걸 말할 때는 She is eating 이런 식으로 be + -ing로 표현하죠. [curious] 그럼 사물이 이미 놓여 있는 상태일 때는... 어떤 표현을 쓸까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "인물이 '지금 ~하고 있다' 이런 걸 말할 때는 She is eating 이런 식으로 be + -ing로 표현하죠. [curious] 그럼 사물이 이미 놓여 있는 상태일 때는... 어떤 표현을 쓸까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "be p.p.",
                "correct": true
              },
              {
                "text": "be being p.p."
              }
            ]
          }
        },
        {
          "no": 3,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (3)",
          "tutor": "사물이 이미 놓여 있는 상태일 때는 be p.p 로 표현해요. [curious] 그럼 반대로 사물에 어떤 동작이 진행되고 있을 때는?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "사물이 이미 놓여 있는 상태일 때는 be p.p 로 표현해요. [curious] 그럼 반대로 사물에 어떤 동작이 진행되고 있을 때는?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "has/have been p.p."
              },
              {
                "text": "be being p.p.",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 4,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (4)",
          "tutor": "has/have been p.p.는 be p.p.랑 비슷한 느낌이죠. 이미 놓여 있는 상태라는 거. be being p.p.는 지금 그 동작이 벌어지는 중이라는 거. [whispers] 이게 들리면 뜻 따지지 말고 사진에서 사람 손부터 찾아. [annoying] 사람이 있어야 물건을 옮기든지 할 거 아니에요. [excited] 사람이 없으면 틀린 선택지죠.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 5,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "[excited] 자, 첫 문제. 여자가 그림을 그리는 중이죠. 사람이 나왔으니 뭐 봐야 된다? [curious] 뭘 하고 있나. [excited] 풀어볼게요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 6,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "학생 풀이",
          "tutor": "",
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
          "no": 7,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "채점",
          "tutor": "정답. 잘하네요! 같이 확인해 볼게요.",
          "focusQ": 0,
          "tutorIfWrong": "정답은 B였어요. 어디서 헷갈렸는지 같이 봅시다.",
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
          "stage": "음원 재생",
          "tutor": "정답 B 다시 들어볼게요.",
          "focusQ": 0,
          "audio": {
            "kind": "option",
            "qIdx": 0,
            "label": "B"
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 9,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "인물이 '지금 ~하고 있다'는 동작을 나타낼 때는 be + -ing로 표현한다고 했죠? [curious] 여기서 여자의 핵심 동작 나타내는 표현, 뭐죠?",
          "focusQ": 0,
          "interaction": {
            "kind": "subjective",
            "prompt": "[curious] 여기서 여자의 핵심 동작 나타내는 표현, 뭐죠?",
            "hint": "is painting (a picture)"
          }
        },
        {
          "no": 10,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "핵심 동작을 나타내는 표현은 is painting a picture. 그 뒤에 나오는 easel은 그림판을 놓는 틀이잖아! [whispers] 사람의 동작이랑 위치를 나타내는 표현 모두 사진과 일치하죠? [excited] 그니까 정답.",
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
          "tutor": "선택지 A에서 rinsing, in a sink라고 했어요. [curious] rinse는 뭐죠?",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "ifPicked",
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
            "prompt": "선택지 A에서 rinsing, in a sink라고 했어요. [curious] rinse는 뭐죠?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "붓다"
              },
              {
                "text": "말리다"
              },
              {
                "text": "헹구다",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 12,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (A)",
          "tutor": "rinse는 '헹구다'. [whispers] 그런데 몰라도 돼. 뒤에 in a sink, 싱크대가 사진에 없잖아요. [excited] 시험장에서 뜻 떠올리는 사이에 다음 음원 나옵니다. [mischievously] 모르는 동사는 버리고 뒤에 붙은 사물부터 보세요.",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "ifPicked",
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
          "no": 13,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서는 is visiting, art gallery 라고 했어요. 여자가 미술관을 방문하고 있어? [annoying] 딱 봐도 아니잖아. 인물의 동작, 장소 모두 일치하는 게 없어요. [mischievously] 명백한 오답이에요.",
          "focusQ": 0,
          "optionRef": "C",
          "gate": "ifPicked",
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
          "no": 14,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D는 is holding, a tube of paint. 드는 건 맞아. 튜브는 책상에 있고 손엔 팔레트고. [mischievously] 동작은 맞고 물건이 틀리고. 반만 맞는 선택지죠.",
          "focusQ": 0,
          "optionRef": "D",
          "gate": "ifPicked",
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
          "no": 15,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "후속 질문",
          "tutor": "혹시 더 설명 필요한 거 있어요?",
          "focusQ": 0,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 더 설명 필요한 거 있어요?",
            "choices": [
              {
                "label": "A",
                "text": "A번 선택지"
              },
              {
                "label": "C",
                "text": "C번 선택지"
              },
              {
                "label": "D",
                "text": "D번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 16,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A에서 rinsing, in a sink라고 했어요. [curious] rinse는 뭐죠?",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "onDemand",
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
            "prompt": "선택지 A에서 rinsing, in a sink라고 했어요. [curious] rinse는 뭐죠?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "붓다"
              },
              {
                "text": "말리다"
              },
              {
                "text": "헹구다",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 17,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (A)",
          "tutor": "rinse는 '헹구다'. [whispers] 그런데 몰라도 돼. 뒤에 in a sink, 싱크대가 사진에 없잖아요. [excited] 시험장에서 뜻 떠올리는 사이에 다음 음원 나옵니다. [mischievously] 모르는 동사는 버리고 뒤에 붙은 사물부터 보세요.",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "onDemand",
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
          "no": 18,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서는 is visiting, art gallery 라고 했어요. 여자가 미술관을 방문하고 있어? [annoying] 딱 봐도 아니잖아. 인물의 동작, 장소 모두 일치하는 게 없어요. [mischievously] 명백한 오답이에요.",
          "focusQ": 0,
          "optionRef": "C",
          "gate": "onDemand",
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
          "no": 19,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D는 is holding, a tube of paint. 드는 건 맞아. 튜브는 책상에 있고 손엔 팔레트고. [mischievously] 동작은 맞고 물건이 틀리고. 반만 맞는 선택지죠.",
          "focusQ": 0,
          "optionRef": "D",
          "gate": "onDemand",
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
          "no": 20,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S7 표현 정리",
          "tutor": "정리할게요. 사람 사진은 순서가 있어요. [excited] 제일 먼저 선택지의 동사 먼저 보고, 그다음 장소랑 사물 맞는지 봅니다.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 21,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "마무리 멘트",
          "tutor": "이제 다음 문제.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 22,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번에는 사진에 사람이 없죠? 사물, 풍경만 나오는 사진에서는 사물의 위치와 상태를 잘 확인해야 해요. 행거에 옷이 걸려있고, 바닥과 왼쪽 선반에 신발이 있고, 우측 벽에는 모자가 걸려있죠? [excited] 이제 문제 풀어보세요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 23,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "학생 풀이",
          "tutor": "",
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
          "no": 24,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "채점",
          "tutor": "정답이에요. 잘 맞혔어요! 정답 같이 확인해볼게요.",
          "focusQ": 1,
          "tutorIfWrong": "정답은 A였어요. 어떤 부분에서 헷갈렸는지 같이 확인해 볼게요.",
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
          "no": 25,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "음원 재생",
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
          "no": 26,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "are lined up, on the floor라고 했어요. [curious] line up은 무슨 뜻일까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "are lined up, on the floor라고 했어요. [curious] line up은 무슨 뜻일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "흩어 놓다"
              },
              {
                "text": "줄지어 놓다",
                "correct": true
              },
              {
                "text": "옮겨 놓다"
              }
            ]
          }
        },
        {
          "no": 27,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "are lined up은 '줄지어 놓여 있다'라는 뜻이에요. 사진 봐봐요. 신발 두 켤레가 옷장 아래 바닥에 줄지어 세워져 있죠? [mischievously] 또 누군가 신발을 줄 세우는 중이 아니라, 신발이 '이미' 줄지어 있는 상태니까 be p.p. 형태인 are lined up이 맞는 말이죠. 그래서 정답이에요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 28,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B는 folded and stacked라고 했어요. 옷이 개여서 쌓여 있다는 의미예요. 옷은 지금 행거에 걸려있으니까 [mischievously] 사진이랑 다르죠? 오답이에요.",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "ifPicked",
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
          "no": 29,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (C)",
          "tutor": "C는 핸드백이 on top of a basket, 바구니 위에 있대요. 핸드백은 있죠. 그런데 행거에 걸렸잖아요. [mischievously] 또 반만 맞는 선택지예요.",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "ifPicked",
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
          "no": 30,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D는 are being stored. [mischievously] 나왔죠, 사람 찾기. [curious] 보관하는 사람이 있어야 하는데, 없죠? 모자는 그냥 벽에 걸려 있을 뿐. on some shelves, 선반 위라는 위치도 안 맞고요.",
          "focusQ": 1,
          "optionRef": "D",
          "gate": "ifPicked",
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
          "no": 31,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
            "choices": [
              {
                "label": "B",
                "text": "B번 선택지"
              },
              {
                "label": "C",
                "text": "C번 선택지"
              },
              {
                "label": "D",
                "text": "D번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 32,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B는 folded and stacked라고 했어요. 옷이 개여서 쌓여 있다는 의미예요. 옷은 지금 행거에 걸려있으니까 [mischievously] 사진이랑 다르죠? 오답이에요.",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "onDemand",
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
          "tutor": "C는 핸드백이 on top of a basket, 바구니 위에 있대요. 핸드백은 있죠. 그런데 행거에 걸렸잖아요. [mischievously] 또 반만 맞는 선택지예요.",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "onDemand",
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
          "stage": "S6 오답 제거 (D)",
          "tutor": "D는 are being stored. [mischievously] 나왔죠, 사람 찾기. [curious] 보관하는 사람이 있어야 하는데, 없죠? 모자는 그냥 벽에 걸려 있을 뿐. on some shelves, 선반 위라는 위치도 안 맞고요.",
          "focusQ": 1,
          "optionRef": "D",
          "gate": "onDemand",
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
          "no": 35,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S7 표현 정리",
          "tutor": "정리할게요. 사물은 두 갈래뿐이에요. 이미 놓여 있으면 be p.p. 또는 has/have been p.p. 지금 벌어지는 중이면 be being p.p., [mischievously] 사람 찾기. [excited] 표현은 be lined up '줄지어 놓여 있다', stack '쌓다'.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 36,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "마무리 멘트",
          "tutor": "이제 다음 문제로 넘어갈게요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 37,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "[excited] 오, 이번 건 조금 어렵다. 선반 위에 화분 여러 개, 바닥에는 식물. 여기까지 봤으면 준비 끝. [whispers] 골라보세요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 38,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "학생 풀이",
          "tutor": "",
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
          "no": 39,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "채점",
          "tutor": "정답! [surprised] 이야, 이거 어려운 건데! 같이 확인해볼게요.",
          "focusQ": 2,
          "tutorIfWrong": "정답은 D였어요. 어디서 헷갈렸는지 같이 확인해 봅시다.",
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
          "no": 40,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "음원 재생",
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
          "no": 41,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "have been lined up이라고 했죠? [whispers] have been p.p.가 나왔으니까 화분이 선반 위에 이미 줄지어 놓여 있는 상태여야 해요. [curious] 사진과 일치하나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "[whispers] have been p.p.가 나왔으니까 화분이 선반 위에 이미 줄지어 놓여 있는 상태여야 해요. [curious] 사진과 일치하나요?",
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
          "no": 42,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "화분이 선반 위에 이미 줄지어 놓여 있는 상태니까 선택지와 일치해요. [whispers] line up은 앞 문제에서도 나왔죠? [excited] 사물 사진에서 자주 나오는 표현이니깐 잘 알아두세요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 43,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A는 are being watered. [mischievously] 어, 또 사람 찾기죠? 식물은 있어요. [curious] 그런데 물 주는 사람이 있나요? [whispers] 없죠. [excited] plant 들렸다고 오 이거다! 하면 안 돼요.",
          "focusQ": 2,
          "optionRef": "A",
          "gate": "ifPicked",
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
          "no": 44,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 shovel은 '삽', shed는 '창고' 라는 뜻이에요. [curious] prop against는 무슨 뜻일까요?",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "ifPicked",
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
            "prompt": "선택지 B에서 shovel은 '삽', shed는 '창고' 라는 뜻이에요. [curious] prop against는 무슨 뜻일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "~위에 쌓다"
              },
              {
                "text": "~에 기대어 세우다",
                "correct": true
              },
              {
                "text": "~안에 넣다"
              }
            ]
          }
        },
        {
          "no": 45,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "prop A against B, A를 B에 기대어 세워 두다. [whispers] 이것도 몰라도 됐어요. [curious] 사진에 삽이 있나요? [excited] 없죠. 없는 사물이 들리면 그 선택지는 거기서 끝.",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "ifPicked",
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
          "no": 46,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서 scattered는 '흩어져 있는'이라는 뜻이에요. [mischievously] 사진에서 큰 나뭇잎들이 바닥 여기저기에 흩어져 있지 않으니까 오답이에요.",
          "focusQ": 2,
          "optionRef": "C",
          "gate": "ifPicked",
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
          "no": 47,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
            "choices": [
              {
                "label": "A",
                "text": "A번 선택지"
              },
              {
                "label": "B",
                "text": "B번 선택지"
              },
              {
                "label": "C",
                "text": "C번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 48,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A는 are being watered. [mischievously] 어, 또 사람 찾기죠? 식물은 있어요. [curious] 그런데 물 주는 사람이 있나요? [whispers] 없죠. [excited] plant 들렸다고 오 이거다! 하면 안 돼요.",
          "focusQ": 2,
          "optionRef": "A",
          "gate": "onDemand",
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
          "no": 49,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 shovel은 '삽', shed는 '창고' 라는 뜻이에요. [curious] prop against는 무슨 뜻일까요?",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "onDemand",
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
            "prompt": "선택지 B에서 shovel은 '삽', shed는 '창고' 라는 뜻이에요. [curious] prop against는 무슨 뜻일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "~위에 쌓다"
              },
              {
                "text": "~에 기대어 세우다",
                "correct": true
              },
              {
                "text": "~안에 넣다"
              }
            ]
          }
        },
        {
          "no": 50,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "prop A against B, A를 B에 기대어 세워 두다. [whispers] 이것도 몰라도 됐어요. [curious] 사진에 삽이 있나요? [excited] 없죠. 없는 사물이 들리면 그 선택지는 거기서 끝.",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "onDemand",
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
          "no": 51,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서 scattered는 '흩어져 있는'이라는 뜻이에요. [mischievously] 사진에서 큰 나뭇잎들이 바닥 여기저기에 흩어져 있지 않으니까 오답이에요.",
          "focusQ": 2,
          "optionRef": "C",
          "gate": "onDemand",
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
          "no": 52,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S7 표현 정리",
          "tutor": "빈출 표현 정리할게요. line up '줄지어 놓다', prop A against B 'A를 B에 기대어 세워 두다', scatter '흩어 놓다'. [curious] line up은 오늘만 두 번 나왔죠?",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 53,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "마무리 멘트",
          "tutor": "좋아요. [excited] 이제 실전 문제로 넘어가 볼게요.",
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
          "tutor": "유형 학습에서 배웠던 전략이랑 개념 적용해서 총 4 문제 실전처럼 풀어볼 거예요. [whispers] 문제 음원 끝나면 바로 정답 체크하도록 연습해보세요. [excited] 시작할게요",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        }
      ],
      review: [
        {
          "no": 54,
          "stage": "음원 재생",
          "tutor": "정답 D를 다시 들어볼게요.",
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
          "no": 55,
          "stage": "S5 정답 근거 연결",
          "tutor": "인물의 핵심 동작은 is picking up이었어요. [curious] pick up은 무슨 뜻일까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "인물의 핵심 동작은 is picking up이었어요. [curious] pick up은 무슨 뜻일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "쌓아 두다"
              },
              {
                "text": "집어 들다",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 56,
          "stage": "S5 정답 근거 연결",
          "tutor": "is picking up은 '집어 들고 있다'라는 뜻이에요. [whispers] 사진에서 남자가 커피 머신 위에 있는 an empty cup, '빈 컵'을 집어 들고 있죠. [excited] 핵심 동작과 사물이 사진과 모두 일치하므로 정답이예요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 57,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A의 tie는 '매다, 묶다', apron은 '앞치마'예요. 앞치마는 하고 있죠. [whispers] 반은 맞아요. [curious] 그런데 지금 묶고 있나요? [excited] 아니죠. 앞에 붙은 tying까지 맞아야 정답이에요.",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "ifPicked",
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
          "no": 58,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 pouring beans into a coffee machine은 커피 머신에 원두를 붓고 있다는 뜻이에요. [mischievously] 사진에는 이런 동작이 없으니까 바로 X 하면 돼요.",
          "focusQ": 0,
          "optionRef": "B",
          "gate": "ifPicked",
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
          "no": 59,
          "stage": "S6 오답 제거 (C)",
          "tutor": "C는 남자가 손님에게 음료를 건네고 있대요. [curious] 그런데 customer, 손님이 사진에 있나요? [excited] 없죠. [whispers] 없는 사람이 들리면 끝까지 들을 것도 없어요.",
          "focusQ": 0,
          "optionRef": "C",
          "gate": "ifPicked",
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
          "no": 60,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 0,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
            "choices": [
              {
                "label": "A",
                "text": "A번 선택지"
              },
              {
                "label": "B",
                "text": "B번 선택지"
              },
              {
                "label": "C",
                "text": "C번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 61,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A의 tie는 '매다, 묶다', apron은 '앞치마'예요. 앞치마는 하고 있죠. [whispers] 반은 맞아요. [curious] 그런데 지금 묶고 있나요? [excited] 아니죠. 앞에 붙은 tying까지 맞아야 정답이에요.",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "onDemand",
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
          "no": 62,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 pouring beans into a coffee machine은 커피 머신에 원두를 붓고 있다는 뜻이에요. [mischievously] 사진에는 이런 동작이 없으니까 바로 X 하면 돼요.",
          "focusQ": 0,
          "optionRef": "B",
          "gate": "onDemand",
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
          "no": 63,
          "stage": "S6 오답 제거 (C)",
          "tutor": "C는 남자가 손님에게 음료를 건네고 있대요. [curious] 그런데 customer, 손님이 사진에 있나요? [excited] 없죠. [whispers] 없는 사람이 들리면 끝까지 들을 것도 없어요.",
          "focusQ": 0,
          "optionRef": "C",
          "gate": "onDemand",
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
          "no": 64,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 표현만 정리할게요. [excited] pick up은 '집어 들다', pour은 '붓다', hand는 '건네주다' 예요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 65,
          "stage": "음원 재생",
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
          "no": 66,
          "stage": "S5 정답 근거 연결",
          "tutor": "is hanging이라는 표현이 나왔죠? [excited] hang은 '걸다'라는 뜻도 있지만, 그림이나 물건이 이미 걸려 있는 상태를 말할 때 is hanging처럼 진행 형태로 표현할 수도 있어요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 67,
          "stage": "S6 오답 제거 (B)",
          "tutor": "B의 reading materials는 '읽을 거리'예요. [curious] 사진에 있긴 하네? [mischievously] 또 반은 맞는 선택지죠. [whispers] 그런데 소파 위가 아니라 어디야? [excited] 탁자 위잖아요.",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "ifPicked",
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
          "no": 68,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서 are being installed가 나왔어요. [curious] install은 무슨 뜻이죠?",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "ifPicked",
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
            "prompt": "선택지 C에서 are being installed가 나왔어요. [curious] install은 무슨 뜻이죠?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "옮기다"
              },
              {
                "text": "설치하다",
                "correct": true
              },
              {
                "text": "고치다"
              }
            ]
          }
        },
        {
          "no": 69,
          "stage": "S6 오답 제거 (C)",
          "tutor": "install은 '설치하다'예요. [mischievously] 그런데 are being installed, 또 또 사람 찾기죠? [whispers] 창문을 다는 사람이 없잖아요. [excited] 이미 달려 있으면 are installed나 have been installed라고 해야 맞아요.",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "ifPicked",
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
          "no": 70,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D에서는 화분이 있긴 하지만, 바닥에 떨어져 있지는 않아서 오답이에요.",
          "focusQ": 1,
          "optionRef": "D",
          "gate": "ifPicked",
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
          "no": 71,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
            "choices": [
              {
                "label": "B",
                "text": "B번 선택지"
              },
              {
                "label": "C",
                "text": "C번 선택지"
              },
              {
                "label": "D",
                "text": "D번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 72,
          "stage": "S6 오답 제거 (B)",
          "tutor": "B의 reading materials는 '읽을 거리'예요. [curious] 사진에 있긴 하네? [mischievously] 또 반은 맞는 선택지죠. [whispers] 그런데 소파 위가 아니라 어디야? [excited] 탁자 위잖아요.",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "onDemand",
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
          "no": 73,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서 are being installed가 나왔어요. [curious] install은 무슨 뜻이죠?",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "onDemand",
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
            "prompt": "선택지 C에서 are being installed가 나왔어요. [curious] install은 무슨 뜻이죠?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "옮기다"
              },
              {
                "text": "설치하다",
                "correct": true
              },
              {
                "text": "고치다"
              }
            ]
          }
        },
        {
          "no": 74,
          "stage": "S6 오답 제거 (C)",
          "tutor": "install은 '설치하다'예요. [mischievously] 그런데 are being installed, 또 또 사람 찾기죠? [whispers] 창문을 다는 사람이 없잖아요. [excited] 이미 달려 있으면 are installed나 have been installed라고 해야 맞아요.",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "onDemand",
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
          "no": 75,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D에서는 화분이 있긴 하지만, 바닥에 떨어져 있지는 않아서 오답이에요.",
          "focusQ": 1,
          "optionRef": "D",
          "gate": "onDemand",
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
          "no": 76,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 핵심 정리할게요. [excited] is hanging on a wall은 '벽에 걸려 있다', have been left는 '놓여 있다, 남겨져 있다', are being installed는 '설치되고 있는 중이다'라는 뜻이에요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 77,
          "stage": "음원 재생",
          "tutor": "정답 B를 다시 들어볼게요.",
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
          "no": 78,
          "stage": "S5 정답 근거 연결",
          "tutor": "인물의 동작을 나타내는 표현 is resting her arm이 나왔어요. [curious] rest on 은 무슨 뜻일까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "인물의 동작을 나타내는 표현 is resting her arm이 나왔어요. [curious] rest on 은 무슨 뜻일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "~에 팔을 기대다",
                "correct": true
              },
              {
                "text": "~을 향해 손을 뻗다"
              }
            ]
          }
        },
        {
          "no": 79,
          "stage": "S5 정답 근거 연결",
          "tutor": "rest one's arm on 은 '~에 팔을 기대다'라는 뜻이에요. [whispers] 한 여자가 a glass counter, 유리 진열대 에 팔을 기대고 있다는 의미예요. [excited] 인물의 동작과 위치 모두 일치하니깐 정답이에요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 80,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A는 is reaching into, a shopping cart. 손을 뻗는 건 맞아요. [whispers] 여기까지 반은 맞죠. [curious] 그런데 카트 안으로 뻗어? [excited] 아니죠. 동작이 맞아도 뒤에 붙는 위치에서 갈려요.",
          "focusQ": 2,
          "optionRef": "A",
          "gate": "ifPicked",
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
          "no": 81,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서는 pushing a button on a cash register라고 했는데, 일단 사진에 계산대 버튼은 없죠? [mischievously] 이렇게 사진에 없는 단어가 나오면 빠르게 X하고 넘어가요.",
          "focusQ": 2,
          "optionRef": "C",
          "gate": "ifPicked",
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
          "no": 82,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D는 opening a display case. [whispers] 이거, 이거 꽤 헷갈릴 수 있어. 손을 뻗고는 있거든요. [curious] 그런데 여는 중인가요? [excited] 아니죠. 비슷할수록 동작 하나만 정확히 보면 돼요.",
          "focusQ": 2,
          "optionRef": "D",
          "gate": "ifPicked",
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
          "no": 83,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
            "choices": [
              {
                "label": "A",
                "text": "A번 선택지"
              },
              {
                "label": "C",
                "text": "C번 선택지"
              },
              {
                "label": "D",
                "text": "D번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 84,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A는 is reaching into, a shopping cart. 손을 뻗는 건 맞아요. [whispers] 여기까지 반은 맞죠. [curious] 그런데 카트 안으로 뻗어? [excited] 아니죠. 동작이 맞아도 뒤에 붙는 위치에서 갈려요.",
          "focusQ": 2,
          "optionRef": "A",
          "gate": "onDemand",
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
          "no": 85,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서는 pushing a button on a cash register라고 했는데, 일단 사진에 계산대 버튼은 없죠? [mischievously] 이렇게 사진에 없는 단어가 나오면 빠르게 X하고 넘어가요.",
          "focusQ": 2,
          "optionRef": "C",
          "gate": "onDemand",
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
          "no": 86,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D는 opening a display case. [whispers] 이거, 이거 꽤 헷갈릴 수 있어. 손을 뻗고는 있거든요. [curious] 그런데 여는 중인가요? [excited] 아니죠. 비슷할수록 동작 하나만 정확히 보면 돼요.",
          "focusQ": 2,
          "optionRef": "D",
          "gate": "onDemand",
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
          "no": 87,
          "stage": "S7 표현 정리",
          "tutor": "마지막으로 표현 정리하고 갈게요. [excited] rest one's arm on 은 '~에 팔을 기대다', reach into 는 '~으로 손을 뻗다' 예요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 88,
          "stage": "음원 재생",
          "tutor": "정답 C를 다시 들어볼게요.",
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
          "no": 89,
          "stage": "S5 정답 근거 연결",
          "tutor": "Some desktops, 일부 책상이, have been divided, 나뉘어 있다, with partitions, 파티션으로 라는 의미예요. [curious] 사진에서 책상이 파티션으로 나뉘어 있나요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "Some desktops, 일부 책상이, have been divided, 나뉘어 있다, with partitions, 파티션으로 라는 의미예요. [curious] 사진에서 책상이 파티션으로 나뉘어 있나요?",
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
          "no": 90,
          "stage": "S5 정답 근거 연결",
          "tutor": "사진에서 책상이 파티션으로 나뉘어 있는 상태이죠? [excited] 사물 사진에서는 이렇게 사물이 어떤 상태로 배치돼 있는지를 정확하게 들어야 해요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 91,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A는 are being emptied. [mischievously] 오늘 마지막 사람 찾기예요. 쓰레기통은 있죠. [curious] 그런데 비우는 사람이 있나요? [whispers] 없어요. [excited] 이 형태는 사물 말고 사람부터.",
          "focusQ": 3,
          "optionRef": "A",
          "gate": "ifPicked",
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
          "no": 92,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 along은 '~를 따라서'라는 의미예요. [curious] be positioned는 무슨 의미일까요?",
          "focusQ": 3,
          "optionRef": "B",
          "gate": "ifPicked",
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
            "kind": "choice",
            "prompt": "선택지 B에서 along은 '~를 따라서'라는 의미예요. [curious] be positioned는 무슨 의미일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "배치되어 있다",
                "correct": true
              },
              {
                "text": "설치되고 있다"
              }
            ]
          }
        },
        {
          "no": 93,
          "stage": "S6 오답 제거 (B)",
          "tutor": "have been positioned는 '배치되어 있다'라는 의미예요. 의자들이 along a wall, 벽을 따라 놓여 있다고 했어요. [whispers] 그런데 사진의 의자 위치와 다르죠? [excited] 이렇게 위치를 나타내는 전치사 표현도 잘 알아두어야 함정에 안넘어갑니다.",
          "focusQ": 3,
          "optionRef": "B",
          "gate": "ifPicked",
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
          "no": 94,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D에서는 There is a stack of documents 서류 더미가 있다, at each workstation. 각 업무공간마다 라고 했죠. [mischievously] 그런데 사진에 a stack of documents, 서류 더미가 보이지 않으니까 오답이에요.",
          "focusQ": 3,
          "optionRef": "D",
          "gate": "ifPicked",
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
          "no": 95,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 3,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
            "choices": [
              {
                "label": "A",
                "text": "A번 선택지"
              },
              {
                "label": "B",
                "text": "B번 선택지"
              },
              {
                "label": "D",
                "text": "D번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 96,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A는 are being emptied. [mischievously] 오늘 마지막 사람 찾기예요. 쓰레기통은 있죠. [curious] 그런데 비우는 사람이 있나요? [whispers] 없어요. [excited] 이 형태는 사물 말고 사람부터.",
          "focusQ": 3,
          "optionRef": "A",
          "gate": "onDemand",
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
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 along은 '~를 따라서'라는 의미예요. [curious] be positioned는 무슨 의미일까요?",
          "focusQ": 3,
          "optionRef": "B",
          "gate": "onDemand",
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
            "kind": "choice",
            "prompt": "선택지 B에서 along은 '~를 따라서'라는 의미예요. [curious] be positioned는 무슨 의미일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "배치되어 있다",
                "correct": true
              },
              {
                "text": "설치되고 있다"
              }
            ]
          }
        },
        {
          "no": 98,
          "stage": "S6 오답 제거 (B)",
          "tutor": "have been positioned는 '배치되어 있다'라는 의미예요. 의자들이 along a wall, 벽을 따라 놓여 있다고 했어요. [whispers] 그런데 사진의 의자 위치와 다르죠? [excited] 이렇게 위치를 나타내는 전치사 표현도 잘 알아두어야 함정에 안넘어갑니다.",
          "focusQ": 3,
          "optionRef": "B",
          "gate": "onDemand",
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
          "tutor": "D에서는 There is a stack of documents 서류 더미가 있다, at each workstation. 각 업무공간마다 라고 했죠. [mischievously] 그런데 사진에 a stack of documents, 서류 더미가 보이지 않으니까 오답이에요.",
          "focusQ": 3,
          "optionRef": "D",
          "gate": "onDemand",
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
          "tutor": "표현 정리할게요. partition 칸막이, be positioned 배치되어 있다, along a wall 벽을 따라. [excited] 사람 찾기와 반은 맞는 선택지에 항상 유의해서 보기.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        }
      ],
    },
    'RC-P5-08': {
      intro: {
        "script": "오늘은 Part 5에서 자주 나오는 능동태와 수동태 문제를 공부해볼 거예요. 공식처럼 몇 가지 사항들만 잘 익히면 빠르게 풀고 넘어갈 수 있는 유형이에요. [whispers] 핵심은 동사의 목적어가 있는지 없는지 파악하는 거예요. [curious] 그럼 수업하러 가볼까요?",
        "points": [
          "빈칸이 동사 자리인지 확인하기",
          "동사의 목적어 유무 확인하기",
          "주어와 동사의 의미 관계 확인하기"
        ]
      },
      summary: [
        {
          "title": "Part 5 능동태·수동태 핵심 정리",
          "intro": "오늘 배운 내용 빠르게 정리해볼게요. [excited] 빈칸에 들어갈 말을 채워서 문장을 소리 내어 말해 보세요!",
          "items": [
            {
              "id": "s1_1",
              "en": "능동·수동을 판단할 때 첫째, 빈칸이 ___ 자리인지 확인한다.",
              "ko": "맞아요. 빈칸 앞뒤를 확인해서 빈칸이 동사 자리인지 봐야한다고 했어요.",
              "answer": "동사",
              "choices": [],
              "keywords": [
                "동사"
              ]
            },
            {
              "id": "s1_2",
              "en": "빈칸 자리를 확인했으면 둘째, 빈칸 뒤에 동사의 ___가 있는지 확인한다.",
              "ko": "맞아요. 동사 뒤 목적어 유무를 먼저 확인한다고 했죠? 목적어가 없으면 수동태가 올 가능성이 높아요.",
              "answer": "목적어",
              "choices": [],
              "keywords": [
                "목적어"
              ]
            },
            {
              "id": "s1_3",
              "en": "목적어 유무로 판단하기 애매할 때는 셋째, ___을 확인한다.",
              "ko": "맞아요. 주어가 행동하는 쪽인지, 받는 쪽인지 의미 확인한다고 했죠?",
              "answer": "주어와 동사의 의미 관계",
              "choices": [],
              "keywords": [
                "주어와 동사의 의미 관계"
              ]
            },
            {
              "id": "s1_4",
              "en": "주어가 동작을 직접 하는 주체이면 ___ , 주어가 동작을 받는 대상이면 ___를 쓴다.",
              "ko": "맞아요. 주어가 행동하는 주체이면 능동태, 행동을 받는 대상이면 수동태를 써요.",
              "answer": "능동태",
              "choices": [],
              "keywords": [
                "능동태"
              ],
              "blanks": [
                {
                  "answer": "능동태",
                  "keywords": [
                    "능동태"
                  ]
                },
                {
                  "answer": "수동태",
                  "keywords": [
                    "수동태"
                  ]
                }
              ]
            },
            {
              "id": "s1_5",
              "en": "능수동을 판단한 뒤 선택지가 여러 개 남으면 마지막으로 ___까지 확인한다.",
              "ko": "그렇죠. yesterday 같은 시제 단서나 주어의 수까지 마지막으로 확인하세요.",
              "answer": "수와 시제",
              "choices": [],
              "keywords": [
                "수와 시제"
              ]
            }
          ]
        },
        {
          "title": "핵심 빈출 표현 정리",
          "intro": "마지막으로 오늘 문제에서 나온 토익 빈출 표현을 확인해볼게요. [excited] 영어 표현을 보고 알맞은 뜻을 골라보세요.",
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
      practiceOutro: "실전처럼 잘 풀었나요? [whispers] {전체수} 문제 중 {맞은수} 문제 맞혔어요. [excited] 틀린 문제 한번 같이 볼게요.",
      turns: [
        {
          "no": 1,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (1)",
          "tutor": "[curious] 수동태는 뭐지? 주어가 동작을 당하는 거. 형태는 be + p.p. 여기까진 다 알죠. [whispers] 문제는 시험장에서 3초 안에 판단해야 한다는 거예요. [excited] 그래서 순서를 정해뒀어요. 세 개.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 2,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (2)",
          "tutor": "첫째, 빈칸 앞뒤를 보고 어떤 자리인지 확인해야 해요. [curious] 빈칸이 어떤 자리여야 능수동을 판별할 수 있을까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "첫째, 빈칸 앞뒤를 보고 어떤 자리인지 확인해야 해요. [curious] 빈칸이 어떤 자리여야 능수동을 판별할 수 있을까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "주어 자리"
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
          "no": 3,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (3)",
          "tutor": "능동태/수동태는 결국 \"동사의 형태\"를 고르는 문제이기 때문에, 빈칸이 진짜 동사 자리인지부터 확인해야 해요. [excited] 만약에 문장에 이미 동사가 있는데 빈칸이 또 있다면 빈칸은 동사 자리가 아닐 가능성이 높아요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 4,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (4)",
          "tutor": "빈칸이 동사 자리인 거 확인했으면 둘째, 빈칸 뒤에 뭐가 있는지 확인해야 할까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "빈칸이 동사 자리인 거 확인했으면 둘째, 빈칸 뒤에 뭐가 있는지 확인해야 할까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "보어"
              },
              {
                "text": "목적어",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 5,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (5)",
          "tutor": "네, 목적어예요. 빈칸 뒤에 목적어가 있으면 능동, 없으면 수동. [whispers] 전치사구나 부사면 목적어가 아니고요. [excited] 있으면 능동, 없으면 수동. 이거 하나예요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 6,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (6)",
          "tutor": "목적어로 애매하면 셋째, 주어와 동사의 사이를 봐요. [excited] 직접 하는 쪽이면 능동, 당하는 쪽이면 수동. [whispers] 하는 쪽이냐 당하는 쪽이냐, 그거에 따라 갈리지.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 7,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S2 유형·역할 판별",
          "tutor": "[excited] 자, 첫 문제예요. [curious] 순서 기억하죠? [whispers] 빈칸 앞뒤부터. 동사 자리인지 보고 들어가는 거예요. [excited] 풀어보세요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 8,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "학생 풀이",
          "tutor": "",
          "focusQ": 0,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 0
          }
        },
        {
          "no": 9,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "채점",
          "tutor": "정답이에요. 잘 맞혔어요! 정답 같이 확인해볼게요.",
          "focusQ": 0,
          "tutorIfWrong": "정답은 B였어요. 어떤 부분에서 헷갈렸는지 같이 확인해볼게요.",
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
          "no": 10,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "빈칸 앞에 be동사 are에 동그라미 쳐보세요.",
          "focusQ": 0,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "mark",
            "prompt": "빈칸 앞에 be동사 are에 동그라미 쳐보세요.",
            "targetWords": [
              "are"
            ]
          }
        },
        {
          "no": 11,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "빈칸 앞에 be동사가 나왔어요. 따라서 빈칸은 are과 함께 동사를 이루는 자리일 가능성이 높아요. [whispers] 빈칸 뒤에 목적어 없이 전치사구 for easy replacement가 나왔고, 주어인 All component parts, 모든 구성품은 표준화되는 대상이죠. [excited] 따라서 정답은 p.p. 형태인 standardized 였어요.",
          "focusQ": 0,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 12,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S4 구조·흐름 파악",
          "tutor": "빈칸 앞에 are에 동그라미 쳐보세요.",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "mark",
            "prompt": "빈칸 앞에 are에 동그라미 쳐보세요.",
            "targetWords": [
              "are"
            ]
          }
        },
        {
          "no": 13,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S4 구조·흐름 파악",
          "tutor": "빈칸 앞에 be동사가 나왔죠? [excited] 이런 경우에는 빈칸은 are과 함께 동사를 이루는 자리일 가능성이 높아요.",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 14,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그러면 빈칸 뒤에 동사의 목적어가 있어요, 없어요?",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "그러면 빈칸 뒤에 동사의 목적어가 있어요, 없어요?",
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
          "no": 15,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S4 구조·흐름 파악",
          "tutor": "빈칸 뒤의 for easy replacement는 전치사구라서 동사의 목적어가 아니죠. [whispers] 다음으로 주어 동사의 의미 관계도 확인해볼게요. [curious] 주어 All component parts, 모든 구성품은 무언가를 표준화하는 주체인가요, 표준화되는 대상인가요?",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "빈칸 뒤의 for easy replacement는 전치사구라서 동사의 목적어가 아니죠. [whispers] 다음으로 주어 동사의 의미 관계도 확인해볼게요. [curious] 주어 All component parts, 모든 구성품은 무언가를 표준화하는 주체인가요, 표준화되는 대상인가요?",
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
          "no": 16,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S4 구조·흐름 파악",
          "tutor": "구성품은 표준화되는 대상이니까 수동태 are + p.p.가 필요해요. [whispers] 그래서 정답은 B. standardized예요. [excited] 문장 해석해보면 \"All component parts of Lowry automatic doors , 로우리 자동문의 모든 구성품은, are standardized, 표준화되어 있다, for easy replacement, 간편한 교체를 위해\"라는 의미예요.",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 17,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A. standardizing. 진행형이라 능동이죠. [excited] 바로 지웁니다.",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "ifPicked",
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
          "no": 18,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (C)",
          "tutor": "C. standardizes. [whispers] 붙여 읽어보세요, are standardizes. [curious] 동사가 두 번이죠? [excited] 뜻 볼 것도 없이 엑스.",
          "focusQ": 0,
          "optionRef": "C",
          "gate": "ifPicked",
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
          "no": 19,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D. standardization은 명사라 be동사 뒤 보어로 올 수 있어요. 형태는 통과. [curious] 그런데 '구성품은 표준화이다'? [whispers] 말이 안 되죠. [mischievously] 말은 되는데 말이 안 되는 선택지예요.",
          "focusQ": 0,
          "optionRef": "D",
          "gate": "ifPicked",
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
          "no": 20,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 0,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
            "choices": [
              {
                "label": "A",
                "text": "A번 선택지"
              },
              {
                "label": "C",
                "text": "C번 선택지"
              },
              {
                "label": "D",
                "text": "D번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 21,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A. standardizing. 진행형이라 능동이죠. [excited] 바로 지웁니다.",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "onDemand",
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
          "no": 22,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (C)",
          "tutor": "C. standardizes. [whispers] 붙여 읽어보세요, are standardizes. [curious] 동사가 두 번이죠? [excited] 뜻 볼 것도 없이 엑스.",
          "focusQ": 0,
          "optionRef": "C",
          "gate": "onDemand",
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
          "no": 23,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D. standardization은 명사라 be동사 뒤 보어로 올 수 있어요. 형태는 통과. [curious] 그런데 '구성품은 표준화이다'? [whispers] 말이 안 되죠. [mischievously] 말은 되는데 말이 안 되는 선택지예요.",
          "focusQ": 0,
          "optionRef": "D",
          "gate": "onDemand",
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
          "no": 24,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S7 표현 정리",
          "tutor": "정리할게요. 빈칸 뒤 목적어, 그다음 주어와 동사 사이. [whispers] 안 갈리면 형태로, 그래도 안 되면 뜻으로 지워요. [excited] 어휘는 component part 구성 부품, standardize 표준화하다, replacement 교체품.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 25,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "마무리 멘트",
          "tutor": "이제 다음 문제로 넘어갈게요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 26,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S2 유형·역할 판별",
          "tutor": "이 문제도 먼저 빈칸 앞뒤를 확인해서 빈칸이 동사 자리인지 판단해야 해요. [excited] 이제 문제 풀어보세요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 27,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "학생 풀이",
          "tutor": "",
          "focusQ": 1,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 1
          }
        },
        {
          "no": 28,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "채점",
          "tutor": "정답이에요. 잘 맞혔어요! 정답 같이 확인해볼게요.",
          "focusQ": 1,
          "tutorIfWrong": "정답은 D였어요. 어떤 부분에서 헷갈렸는지 같이 확인해볼게요.",
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
          "no": 29,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "빈칸 앞에 cannot에 동그라미 쳐보세요.",
          "focusQ": 1,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "mark",
            "prompt": "빈칸 앞에 cannot에 동그라미 쳐보세요.",
            "targetWords": [
              "cannot"
            ]
          }
        },
        {
          "no": 30,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "빈칸 앞에 조동사 cannot이 왔으므로 빈칸은 동사원형이 들어갈 자리였죠? 조동사가 있어도 능수동을 판단하는 방법은 똑같아요. [whispers] 뒤에 목적어 없이 전치사구 by any user가 나왔고, 주어 the settings, 설정은 변경되는 대상이에요. [excited] 그래서 정답은 수동태 형태인 D. be altered 였어요.",
          "focusQ": 1,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 31,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S4 구조·흐름 파악",
          "tutor": "빈칸 앞에 cannot은 조동사죠. [curious] 조동사 뒤에는 어떤 형태가 와야 할까요?",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "빈칸 앞에 cannot은 조동사죠. [curious] 조동사 뒤에는 어떤 형태가 와야 할까요?",
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
          "no": 32,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S4 구조·흐름 파악",
          "tutor": "조동사 뒤에는 동사원형이 와야 해요. [whispers] 조동사가 있어도 능수동을 판단하는 방법은 똑같아요. [curious] 빈칸 뒤 by any user은 동사의 목적어인가요, 아닌가요?",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "조동사 뒤에는 동사원형이 와야 해요. [whispers] 조동사가 있어도 능수동을 판단하는 방법은 똑같아요. [curious] 빈칸 뒤 by any user은 동사의 목적어인가요, 아닌가요?",
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
          "no": 33,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S4 구조·흐름 파악",
          "tutor": "전치사구는 목적어가 될 수 없어요. [curious] 근데 여기 by any user, 이게 진짜 힌트예요. 'by + 행위자'. [mischievously] 이런 건 범인 표시지. [whispers] 범인이 있다는 건 주어가 당한 쪽이라는 뜻이거든요. [excited] 주어 The settings, 즉 설정은 변경을 당했다는 거지.",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 34,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그러면 빈칸 뒤에 목적어가 없고, 주어는 변경되는 대상이니까 수동태가 필요해요. [whispers] 그래서 정답은 D. be altered예요. [mischievously] 문장 해석해보면 'The settings in your Buzz virtual meeting room, 버즈 가상 회의실의 설정은, cannot be altered, 변경될 수 없다, by any user, 어떤 사용자에 의해서도, without the 10-digit control code, 10자리 제어 코드 없이는.' 이에요.",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 35,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A. to alter는 to부정사 형태이므로 조동사 뒤에 올 수 없어요.",
          "focusQ": 1,
          "optionRef": "A",
          "gate": "ifPicked",
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
          "no": 36,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C. altering은 현재분사 형태니까 조동사 뒤에 올 수 없어요.",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "ifPicked",
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
          "no": 37,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (B)",
          "tutor": "B. alter는 형태만 통과, 능동이라 오답이에요. [whispers] 여기가 잘 걸려요.",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "ifPicked",
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
          "no": 38,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
            "choices": [
              {
                "label": "A",
                "text": "A번 선택지"
              },
              {
                "label": "B",
                "text": "B번 선택지"
              },
              {
                "label": "C",
                "text": "C번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 39,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A. to alter는 to부정사 형태이므로 조동사 뒤에 올 수 없어요.",
          "focusQ": 1,
          "optionRef": "A",
          "gate": "onDemand",
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
          "no": 40,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C. altering은 현재분사 형태니까 조동사 뒤에 올 수 없어요.",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "onDemand",
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
          "no": 41,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (B)",
          "tutor": "B. alter는 형태만 통과, 능동이라 오답이에요. [whispers] 여기가 잘 걸려요.",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "onDemand",
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
          "no": 42,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S7 표현 정리",
          "tutor": "정리할게요. 조동사가 있어도 순서는 같아요. 목적어, 주어와 동사 사이. [excited] 형태만 '조동사 + be + p.p.'예요. [whispers] virtual 가상의, alter 변경하다.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 43,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "마무리 멘트",
          "tutor": "이제 다음 문제로 넘어갈게요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 44,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S2 유형·역할 판별",
          "tutor": "이 문제도 마찬가지로 빈칸 자리가 동사 자리인지 확인부터 해야 해요. [excited] 그럼 이제 문제 풀어보세요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 45,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "학생 풀이",
          "tutor": "",
          "focusQ": 2,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 2
          }
        },
        {
          "no": 46,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "채점",
          "tutor": "정답이에요. 잘 맞혔어요! 정답 같이 확인해볼게요.",
          "focusQ": 2,
          "tutorIfWrong": "정답은 A였어요. 어떤 부분에서 헷갈렸는지 같이 확인해볼게요.",
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
          "no": 47,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "빈칸 앞에는 주어 Ms. Levy가 있고, 뒤에는 목적어로 명사구 the team이 나왔어요. 여기서 문장 구조 잠깐 보고 갈게요. [whispers] 'direct + 목적어 + to 부정사'는 '~에게 ~ 하라고 지시하다'라는 의미예요. 따라서 빈칸은 동사 자리이고, 능동태가 들어가야하는 거를 알 수 있죠. [excited] 이런 5형식 형태는 자주 나오는 문장 구조니까 잘 알아두면 좋아요.",
          "focusQ": 2,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 48,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "능동태가 될 수 있는 선택지는 A. directed, B. direct, C. is directing 세 개나 있어요. [whispers] 이럴 때는 마지막으로, 동사의 수와 시제까지 확인해야 해요. [excited] 앞의 when절의 동사 took over에 동그라미 쳐보세요.",
          "focusQ": 2,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "mark",
            "prompt": "능동태가 될 수 있는 선택지는 A. directed, B. direct, C. is directing 세 개나 있어요. [whispers] 이럴 때는 마지막으로, 동사의 수와 시제까지 확인해야 해요. [excited] 앞의 when절의 동사 took over에 동그라미 쳐보세요.",
            "targetWords": [
              "took over"
            ]
          }
        },
        {
          "no": 49,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "when절에서 과거 시제가 쓰였으므로 주절의 시제도 과거 시제가 들어가는 게 적절해요. [excited] 따라서 정답은 A. directed 였어요.",
          "focusQ": 2,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 50,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "빈칸 앞뒤부터 확인할게요. [mischievously] 빈칸 앞에는 주어 Ms. Levy가 있고 문장의 동사가 없으니까 빈칸은 동사 자리예요.",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 51,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "동사 자리인 거 확인했으면 빈칸 뒤에 목적어가 있는지 확인해야 한다고 했어요. [curious] the team은 동사의 목적어일까요?",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "동사 자리인 거 확인했으면 빈칸 뒤에 목적어가 있는지 확인해야 한다고 했어요. [curious] the team은 동사의 목적어일까요?",
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
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "명사구 the team은 동사의 목적어예요. 목적어가 나왔으니까 능동태일 가능성이 높겠죠? [whispers] 여기서 문장 구조 잠깐 보고 갈게요. 'direct + 목적어 + to 부정사'는 '~에게 ~ 하라고 지시하다'라는 의미예요. [curious] 그럼 의미적으로도 Ms. Levy가 팀에게 지시했다라는 능동의 의미가 되죠?",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 53,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "[curious] 어 근데 봐봐. 능동이 될 수 있는 선택지가 A, B, C 셋이나 남았어요. [whispers] 능수동으로는 안 갈린 거죠. [mischievously] 이럴 때 꺼내는 마지막 카드가 뭘까? [excited] 수와 시제. [curious] 앞의 When she took over the project, 시제가 뭐죠?",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "[excited] 수와 시제. [curious] 앞의 When she took over the project, 시제가 뭐죠?",
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
          "no": 54,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S4 구조·흐름 파악",
          "tutor": "과거 동사 took over이 왔으므로 프로젝트를 맡았던 과거 시점의 이야기죠. 그래서 주절인 빈칸에도 과거 시점을 나타내는 선택지가 들어가는 게 자연스러워요. [whispers] 따라서 정답은 A. directed 예요. [excited] 문장 해석하면, 'When she took over the project, 프로젝트를 맡았을 때, Ms. Levy, 레비 씨는, directed, 지시했다, the team, 팀에게, to provide frequent progress updates over the next month, 다음 한 달 동안 진행 상황보고를 자주 하라고' 예요.",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 55,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. direct는 능동이지만 수와 시제가 맞지 않아요.",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "ifPicked",
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
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C. is directing은 현재 진행형이라 시제가 맞지 않아요.",
          "focusQ": 2,
          "optionRef": "C",
          "gate": "ifPicked",
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
          "no": 57,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D. was directed는 수동태이므로 오답이에요.",
          "focusQ": 2,
          "optionRef": "D",
          "gate": "ifPicked",
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
          "no": 58,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
            "choices": [
              {
                "label": "B",
                "text": "B번 선택지"
              },
              {
                "label": "C",
                "text": "C번 선택지"
              },
              {
                "label": "D",
                "text": "D번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 59,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. direct는 능동이지만 수와 시제가 맞지 않아요.",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "onDemand",
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
          "no": 60,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C. is directing은 현재 진행형이라 시제가 맞지 않아요.",
          "focusQ": 2,
          "optionRef": "C",
          "gate": "onDemand",
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
          "no": 61,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D. was directed는 수동태이므로 오답이에요.",
          "focusQ": 2,
          "optionRef": "D",
          "gate": "onDemand",
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
          "no": 62,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S7 표현 정리",
          "tutor": "정리할게요. 목적어, 주어와 동사 사이, 그래도 남으면 시제. 이 순서예요. [mischievously] 카드가 하나 더 있는 거죠. [excited] 표현은 take over 업무를 맡다, direct 지시하다, frequent 잦은, progress 진행.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 63,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "마무리 멘트",
          "tutor": "좋아요. [excited] 이제 실전 문제로 넘어가 볼게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 123,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "실전 안내",
          "tutor": "유형 학습에서 배웠던 전략이랑 개념 적용해서 총 5 문제 실전처럼 풀어볼 거예요. [excited] 시작할게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        }
      ],
      review: [
        {
          "no": 64,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 바로 앞에 will be가 있죠? [whispers] be 동사 뒤에는 -ing, p.p., 명사 같은 형태가 올 수 있다고 했어요. [excited] 그럼 먼저 -ing와 p.p. 중 맞는 형태를 확인해볼게요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 65,
          "stage": "S4 구조·흐름 파악",
          "tutor": "빈칸 뒤에 목적어 있어요, 없어요?",
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
          "no": 66,
          "stage": "S4 구조·흐름 파악",
          "tutor": "for Cordell residents는 전치사구라서 동사의 목적어가 될 수 없어요. 목적어가 없으니까 수동태일 가능성이 높아요. [whispers] 그럼 주어 동사의 의미 관계도 확인할게요. [excited] 주어 entry fee, 입장료는 면제되는 대상이니깐 수동태가 필요한 게 확실해졌죠.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 67,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 C. waived예요. [excited] will be waived, '입장료가 면제될 것이다'라는 미래를 나타내는 수동태가 적절해요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 68,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A. waives. [curious] will be waives, 동사가 두 번이죠? [mischievously] 또예요. [excited] 바로 엑스.",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "ifPicked",
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
          "no": 69,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. waiving 은 현재분사로 능동태니까 오답이에요.",
          "focusQ": 0,
          "optionRef": "B",
          "gate": "ifPicked",
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
          "no": 70,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D. waivers는 명사라 보어 자리는 통과. [mischievously] 또 말은 되는데 말이 안 되는 선택지죠. [curious] 입장료는 면제 증서일 것이다? [excited] 안 되죠.",
          "focusQ": 0,
          "optionRef": "D",
          "gate": "ifPicked",
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
          "no": 71,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 0,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
            "choices": [
              {
                "label": "A",
                "text": "A번 선택지"
              },
              {
                "label": "B",
                "text": "B번 선택지"
              },
              {
                "label": "D",
                "text": "D번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 72,
          "stage": "S6 오답 제거 (A)",
          "tutor": "A. waives. [curious] will be waives, 동사가 두 번이죠? [mischievously] 또예요. [excited] 바로 엑스.",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "onDemand",
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
          "no": 73,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. waiving 은 현재분사로 능동태니까 오답이에요.",
          "focusQ": 0,
          "optionRef": "B",
          "gate": "onDemand",
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
          "no": 74,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D. waivers는 명사라 보어 자리는 통과. [mischievously] 또 말은 되는데 말이 안 되는 선택지죠. [curious] 입장료는 면제 증서일 것이다? [excited] 안 되죠.",
          "focusQ": 0,
          "optionRef": "D",
          "gate": "onDemand",
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
          "no": 75,
          "stage": "S7 표현 정리",
          "tutor": "빈출 표현 정리할게요. [excited] entry fee는 입장료, resident는 주민, waive는 면제하다 예요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 76,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞뒤 먼저 확인할게요. [whispers] 빈칸 앞에는 주어 Romesh Sastry가 있고 문장에 동사가 아직 없죠? [excited] 그러면 빈칸은 동사 자리예요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 77,
          "stage": "S4 구조·흐름 파악",
          "tutor": "동사 자리인 거 확인했으면 이제 능동인지 수동인지 확인하면 돼요. [curious] 먼저 빈칸 뒤에 동사의 목적어 있어요, 없어요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "동사 자리인 거 확인했으면 이제 능동인지 수동인지 확인하면 돼요. [curious] 먼저 빈칸 뒤에 동사의 목적어 있어요, 없어요?",
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
          "no": 78,
          "stage": "S4 구조·흐름 파악",
          "tutor": "전치사구 as the editor-in-chief 는 동사의 목적어가 될 수 없어요. 그럼 주어 동사의 관계도 확인해볼게요. [whispers] 동사 appoint는 '임명하다' 이고, 뒤에 as the editor-in-chief '편집장으로서'라는 뜻이에요. [excited] 주어인 Romesh Sastry는 편집장으로 임명되는 대상이니까 수동태가 필요해요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 79,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 A. was appointed 예요. [mischievously] 뒤에 목적어가 없고, yesterday까지 있으니까 과거 수동태 was appointed가 확실하죠.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 80,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. appoints 는 3인칭 단수이고 능동이라서 오답으로 X 해야해요.",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "ifPicked",
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
          "no": 81,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C. is appointing 진행형이라서 능동이므로 오답이에요.",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "ifPicked",
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
          "no": 82,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D. appointed는 동사의 과거형이라서 능동 형태가 될 수 있으니까 오답으로 X 하세요.",
          "focusQ": 1,
          "optionRef": "D",
          "gate": "ifPicked",
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
          "no": 83,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
            "choices": [
              {
                "label": "B",
                "text": "B번 선택지"
              },
              {
                "label": "C",
                "text": "C번 선택지"
              },
              {
                "label": "D",
                "text": "D번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 84,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. appoints 는 3인칭 단수이고 능동이라서 오답으로 X 해야해요.",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "onDemand",
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
          "no": 85,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C. is appointing 진행형이라서 능동이므로 오답이에요.",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "onDemand",
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
          "no": 86,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D. appointed는 동사의 과거형이라서 능동 형태가 될 수 있으니까 오답으로 X 하세요.",
          "focusQ": 1,
          "optionRef": "D",
          "gate": "onDemand",
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
          "no": 87,
          "stage": "S7 표현 정리",
          "tutor": "빈출 표현 정리할게요. [whispers] appoint는 임명하다, editor-in-chief는 편집장이에요. [excited] 그리고 yesterday처럼 시제를 알려주는 표현도 꼭 확인하세요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 88,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞에는 주어 All of Nakano Furniture's products가 있고, 동사가 없으므로 빈칸은 동사 자리예요. [excited] 그러면 이제 동사의 능수동 확인해볼게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 89,
          "stage": "S4 구조·흐름 파악",
          "tutor": "동사 assemble은 '조립하다'라는 뜻이에요. [curious] 빈칸 뒤에 동사의 목적어가 있나요, 없나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "동사 assemble은 '조립하다'라는 뜻이에요. [curious] 빈칸 뒤에 동사의 목적어가 있나요, 없나요?",
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
          "no": 90,
          "stage": "S4 구조·흐름 파악",
          "tutor": "piece by piece는 '하나씩'이라는 부사구니까 목적어가 아니야. [curious] 그리고 뒤에 by expert carpenters. 범인 표시 나왔죠? [whispers] 조립한 사람이 있대, [excited] 그럼 제품은 조립을 당한 쪽이죠.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 91,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그럼 이제 주어 동사의 의미 관계도 확인할게요. [excited] 주어인 '나카노 가구의 모든 제품'은 조립되는 대상이니깐 수동태가 필요해요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 92,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 D. are assembled예요. [mischievously] 동사의 목적어가 없고, 제품도 조립되는 대상이므로 수동태 are assembled, '조립된다'가 적절해요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 93,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A. assemble은 동사원형 형태로 능동이므로 오답이에요.",
          "focusQ": 2,
          "optionRef": "A",
          "gate": "ifPicked",
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
          "no": 94,
          "stage": "S6 오답 제거 (B)",
          "tutor": "B. assembled. [whispers] p.p. 같지만 be동사가 없으면 그냥 과거형, [excited] 능동이에요.",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "ifPicked",
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
          "no": 95,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C. are assembling은 능동 진행 형태라서 오답이에요.",
          "focusQ": 2,
          "optionRef": "C",
          "gate": "ifPicked",
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
          "no": 96,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
            "choices": [
              {
                "label": "A",
                "text": "A번 선택지"
              },
              {
                "label": "B",
                "text": "B번 선택지"
              },
              {
                "label": "C",
                "text": "C번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 97,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A. assemble은 동사원형 형태로 능동이므로 오답이에요.",
          "focusQ": 2,
          "optionRef": "A",
          "gate": "onDemand",
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
          "no": 98,
          "stage": "S6 오답 제거 (B)",
          "tutor": "B. assembled. [whispers] p.p. 같지만 be동사가 없으면 그냥 과거형, [excited] 능동이에요.",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "onDemand",
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
          "no": 99,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C. are assembling은 능동 진행 형태라서 오답이에요.",
          "focusQ": 2,
          "optionRef": "C",
          "gate": "onDemand",
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
          "no": 100,
          "stage": "S7 표현 정리",
          "tutor": "빈출 표현 정리할게요. [whispers] assemble은 조립하다, expert는 전문가의, carpenter는 목수예요. [excited] 'by + 사람'은 수동태에서 누구에 의해 행위가 이루어지는지 알려주는 표현으로 자주 나오니까 꼭 알아두세요!",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 101,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞에는 주어 Ms.Chin 이 있고 문장에 동사가 없으므로 빈칸은 동사 자리예요. [excited] 빈칸이 동사 자리인 거 확인했으니, 이제 능동인지 수동인지 확인해볼게요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 102,
          "stage": "S4 구조·흐름 파악",
          "tutor": "동사 assume은 '업무를 맡다'라는 의미예요. [curious] 빈칸 뒤에 assume의 목적어가 있나요, 없나요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "동사 assume은 '업무를 맡다'라는 의미예요. [curious] 빈칸 뒤에 assume의 목적어가 있나요, 없나요?",
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
          "no": 103,
          "stage": "S4 구조·흐름 파악",
          "tutor": "뒤에 명사구 Mr.Stepp's duties 가 동사의 목적어로 나왔어요. [whispers] 그러면 주어와 동사의 의미 관계도 확인해보면, 주어인 Ms.Chin은 업무를 직접 맡는 주체예요. [excited] 따라서 빈칸에는 능동태가 필요해요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 104,
          "stage": "S4 구조·흐름 파악",
          "tutor": "능동인 선택지가 A. assumed랑 D. will assume, 둘 남았어요. [mischievously] 또 시제 카드를 꺼낼 차례죠. [whispers] while he is at a weeklong marketing seminar, 그가 세미나에 가 있는 동안. 그 기간에 업무를 맡는 거니까, [curious] 어떤 시제가 자연스러울까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "능동인 선택지가 A. assumed랑 D. will assume, 둘 남았어요. [mischievously] 또 시제 카드를 꺼낼 차례죠. [whispers] while he is at a weeklong marketing seminar, 그가 세미나에 가 있는 동안. 그 기간에 업무를 맡는 거니까, [curious] 어떤 시제가 자연스러울까요?",
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
          "no": 105,
          "stage": "S4 구조·흐름 파악",
          "tutor": "while 같은 시간 표현 뒤에서는, 앞으로 일어날 일을 말할 때도 will 대신 is 같은 현재형을 쓸 수 있어요. [curious] 그러면 그 기간 동안 Ms.Chin이 업무를 맡게 될 것이라는 미래의 의미가 자연스럽죠?",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 106,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 D. will assume이에요. [excited] 동사의 목적어가 있고, 주어가 행동하는 주체이고, 미래 시제까지 맞으니까 will assume이 적절해요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 107,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A. assumed 는 과거 시제니까 오답이에요.",
          "focusQ": 3,
          "optionRef": "A",
          "gate": "ifPicked",
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
          "no": 108,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. to assume은 to부정사라서 동사 자리에 올 수 없어요.",
          "focusQ": 3,
          "optionRef": "B",
          "gate": "ifPicked",
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
          "no": 109,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C. is assumed 는 수동태이므로 오답으로 X 하면 돼요.",
          "focusQ": 3,
          "optionRef": "C",
          "gate": "ifPicked",
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
          "no": 110,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 3,
          "interaction": {
            "kind": "askOption",
            "prompt": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
            "choices": [
              {
                "label": "A",
                "text": "A번 선택지"
              },
              {
                "label": "B",
                "text": "B번 선택지"
              },
              {
                "label": "C",
                "text": "C번 선택지"
              },
              {
                "label": null,
                "text": "없어요"
              }
            ]
          }
        },
        {
          "no": 111,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A. assumed 는 과거 시제니까 오답이에요.",
          "focusQ": 3,
          "optionRef": "A",
          "gate": "onDemand",
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
          "no": 112,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. to assume은 to부정사라서 동사 자리에 올 수 없어요.",
          "focusQ": 3,
          "optionRef": "B",
          "gate": "onDemand",
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
          "no": 113,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C. is assumed 는 수동태이므로 오답으로 X 하면 돼요.",
          "focusQ": 3,
          "optionRef": "C",
          "gate": "onDemand",
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
          "no": 114,
          "stage": "S7 표현 정리",
          "tutor": "핵심 표현 정리할게요. [excited] assume은 여기서 '업무를 맡다'라는 의미이고, while 뒤에 현재형이 나와도 미래 일을 말할 수 있다는 것을 잘 알아두세요!",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 115,
          "stage": "S2 유형·역할 판별",
          "tutor": "문제 보자마자 빈칸 앞뒤 확인해서 빈칸이 무슨 자리인지 확인해야 한다고 했죠? [excited] 빈칸 앞에 that에 동그라미 치세요.",
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
          "no": 116,
          "stage": "S2 유형·역할 판별",
          "tutor": "여기서 that은 바로 앞의 the building을 수식하는 관계대명사이고, 관계사절의 주어 역할을 해요. [mischievously] that 뒤에는 동사가 없으니까 빈칸은 동사 자리예요.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 117,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그러면 동사의 능수동을 확인해볼게요. [whispers] 먼저 빈칸 뒤에 목적어 있는지 없는지 확인하라고 했죠? [mischievously] 뒤에 목적어가 없으니까 수동태일 가능성이 높아요.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 118,
          "stage": "S4 구조·흐름 파악",
          "tutor": "다음으로 의미 확인할게요. 선행사 the building과 동사 construct의 관계를 확인하면 돼요. [whispers] 동사 construct는 '건설하다'라는 뜻이에요. [curious] 건물은 무언가를 건설하는 주체예요, 건설되는 대상이에요?",
          "focusQ": 4,
          "interaction": {
            "kind": "choice",
            "prompt": "다음으로 의미 확인할게요. 선행사 the building과 동사 construct의 관계를 확인하면 돼요. [whispers] 동사 construct는 '건설하다'라는 뜻이에요. [curious] 건물은 무언가를 건설하는 주체예요, 건설되는 대상이에요?",
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
          "no": 119,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요! 그러면 빈칸에는 수동태가 들어가야겠죠? [whispers]",
          "focusQ": 4,
          "tutorIfWrong": "다시 한번 생각해보세요. 건물은 건설되는 대상이죠. [curious] 그러면 빈칸에는 수동태가 들어가야겠죠?",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 120,
          "stage": "S6 오답 제거",
          "tutor": "선택지 볼게요. [excited] 수동이 필요하니까 능동은 한 번에 지워버려. [whispers] A. is constructing 능동 진행, B. constructed 과거형, D. has constructed 완료형. [curious] 셋 다 능동이죠? [excited] 한 번에 지우면 답이 남아요.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 121,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 C. was constructed예요. [mischievously] 뒤에 목적어도 없고, 건물은 지어지는 대상이니까 수동태 was constructed가 맞죠.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 122,
          "stage": "S7 표현 정리",
          "tutor": "정리할게요. architect 건축가, structure 구조물, construct 짓다·건설하다, differ 다르다. [curious] 오늘 주의 깊게 봐야 할 거 뭐죠? [excited] 동사 두 번, 범인 표시, 말은 되는데 말이 안 되는 선택지.",
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
