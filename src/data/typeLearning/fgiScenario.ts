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
  /** 개념 학습 구간 내내 화면에 떠 있는 **토익 TIP 판** (시트 '개념 학습' 의 TIP 칸).
   *  처음에는 `( ① ______ )` 가 빈칸인 채로 크게 뜨고, S3 턴이 지날 때마다 그 턴의
   *  `tipAt` 이 가리키는 칸이 하나씩 열린다. 구간이 끝나면 학생이 '확인' 을 눌러 접는다. */
  conceptTip?: { body: string[]; vocab: { en: string; ko: string }[] }
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
        "script": "오늘은 토익 Part 1의 사람 동작과 사물 상태 사진을 살펴볼게요.\nPart 1에서는 사진 속 사람이 무엇을 하고 있는지, 또 사물이 어떤 상태인지 묘사하는 문장이 자주 나오는데요.\n사진을 보고 눈에 보이는 행동이나 상태를 정확하게 파악하는 것이 중요합니다.\n그럼 실제 사진을 보면서 어떤 표현들이 나오는지 함께 살펴볼게요.",
        "points": [
          "사람이 무엇을 하고 있는지 확인하기",
          "사물이 어디에 있고 어떤 상태인지 확인하기",
          "진행 중인 행동과 이미 완료된 상태 구분하기"
        ]
      },
      summary: [
        {
          "title": "Part 1 사람·사물 사진 핵심 정리",
          "intro": "오늘 배운 내용을 빠르게 정리해 볼게요. 빈칸에 들어갈 말을 채우면서 이번 강의에서 배운 핵심 내용을 다시 확인해 보세요!",
          "items": [
            {
              "id": "s1_1",
              "head": "인물 사진",
              "en": "• 인물의 ___ 파악하기\n• 행동뿐만 아니라 관련된 사물도 함께 확인하기",
              "ko": "맞아요. 인물 사진에서는 먼저 인물의 행동이나 동작을 파악하는 게 중요해요. 그리고 사람이 무엇을 하고 있는지만 보지 말고, 주변 사물도 함께 확인해 주세요.",
              "answer": "행동",
              "choices": [],
              "keywords": [
                "행동",
                "동작"
              ]
            },
            {
              "id": "s1_2",
              "head": "사물 사진",
              "en": "• 사물의 ___와 상태를 빠르게 확인하기",
              "ko": "맞아요. 사물 사진에서는 사물의 위치와 상태를 빠르게 확인해야 해요. 어디에 있는지, 어떤 상태인지 함께 살펴보세요.",
              "answer": "위치",
              "choices": [],
              "keywords": [
                "위치"
              ]
            },
            {
              "id": "s1_3",
              "head": "진행 중인 행동 vs 이미 완료된 상태",
              "en": "• The wall is ___ painted.\n→ 벽이 칠해지고 있는 중이다.\n• The wall has been painted.\n→ 벽이 이미 칠해진 상태다.",
              "ko": "정답이에요. is나 are 뒤에 being이 들어가면 어떤 행동이 지금 진행되고 있다는 의미예요. 반면 has 또는 have been p.p.는 이미 행동이 완료된 상태를 나타냅니다.",
              "answer": "being",
              "choices": [],
              "keywords": [
                "being"
              ]
            },
            {
              "id": "s1_4",
              "head": "옷과 관련된 표현",
              "en": "• wear → 입고 있는 상태\n• ___ → 입는 동작",
              "ko": "맞아요. 옷과 관련된 표현은 wear와 put on을 구분해야 해요. wear는 입고 있는 상태, put on은 옷을 입는 동작을 나타냅니다.",
              "answer": "put on",
              "choices": [],
              "keywords": [
                "put on"
              ]
            },
            {
              "id": "s1_5",
              "head": "[걸려 있다]를 나타낼 수 있는 2가지 표현",
              "en": "• Something ___ on a wall. → 걸려 있는 상태\n• Something has been hung on a wall. → 누군가에 의해 걸린 상태",
              "ko": "정답이에요. 무언가가 걸려 있는 사진의 보기로 잘 나올 수 있으니 2가지 표현 잘 기억해두세요.",
              "answer": "is hanging",
              "choices": [],
              "keywords": [
                "is hanging"
              ]
            }
          ]
        },
        {
          "title": "핵심 빈출 표현 정리",
          "intro": "마지막으로 오늘 문제에서 나온 토익 빈출 표현 확인해 볼게요. 영어 표현을 보고 알맞은 뜻을 골라보세요.",
          "items": [
            {
              "id": "s2_1",
              "en": "rinse = ___",
              "ko": "수고했어요! 오늘 수업에서 다룬 주요 어휘를 모두 확인했어요. 헷갈렸던 표현은 뜻이 바로 떠오를 수 있도록 한 번 더 복습해 두세요.",
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
              "answer": "줄지어 놓다",
              "choices": [
                "흩어놓다",
                "줄지어 놓다",
                "들어 올리다"
              ],
              "keywords": [
                "줄지어 놓다"
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
          "tutor": "먼저 사진 속 여자의 행동을 확인해볼게요. 지금 무엇을 하고 있죠?",
          "focusQ": 0,
          "interaction": {
            "kind": "subjective",
            "prompt": "먼저 사진 속 여자의 행동을 확인해볼게요. 지금 무엇을 하고 있죠?",
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
          "tutor": "정답이 아니에요. 핵심 행동부터 다시 잡고 한 번 더 풀어볼게요.",
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
          "stage": "S5 정답 근거 연결 - B",
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
          "stage": "S5 정답 근거 연결 - B",
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
          "stage": "S5 피드백 - B",
          "tutor": "그렇죠. painting a picture이 사진 속 행동과 정확히 일치해요.",
          "focusQ": 0,
          "gate": "ifCorrect",
          "tutorIfWrong": "핵심 표현은 painting a picture, '그림을 그리고 있다'이니 사진 속 행동과 정확히 일치하죠!",
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
          "stage": "S5 피드백 - B",
          "tutor": "맞아요! painting a picture이 사진 속 행동과 딱 맞죠.",
          "focusQ": 0,
          "gate": "ifWrong",
          "tutorIfWrong": "여기서는 B예요. painting a picture, '그림을 그리고 있다'가 사진 속 행동과 정확히 맞아요.",
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
          "tutor": "A의 rinsing a paintbrush는 왜 오답일까요?",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "ifPicked",
          "path": "ifCorrect",
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
            "prompt": "A의 rinsing a paintbrush는 왜 오답일까요?",
            "hint": "붓을 헹구는 행동이 아니어서요. / 붓을 잡고 그림을 그리고 있어서요."
          }
        },
        {
          "no": 11,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 rinsing의 원형 rinse는 '헹구다'라는 뜻이에요. 그러면 보기 A는 왜 오답일까요?",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "ifPicked",
          "path": "ifWrong",
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
            "prompt": "A의 rinsing의 원형 rinse는 '헹구다'라는 뜻이에요. 그러면 보기 A는 왜 오답일까요?",
            "hint": "붓을 헹구는 행동이 아니어서요. / 붓을 잡고 그림을 그리고 있어서요."
          }
        },
        {
          "no": 12,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - A",
          "tutor": "맞아요. paintbrush가 보여도 행동이 다르면 오답! 사진에 sink, 싱크대 자체도 보이지 않아요. 이렇게 사진 속에 없는 명사가 등장하는 오답 보기도 자주 나와요.",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "ifPicked",
          "path": "ifCorrect",
          "tutorIfWrong": "rinse a paintbrush는 '붓을 헹구다'예요. 사진 속 여자는 붓을 헹구는 게 아니라 그림을 그리고 있죠.사진에 sink, 싱크대 자체도 보이지 않아요. 이렇게 사진 속에 없는 명사가 등장하는 오답 보기가 자주 나와요.",
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
          "stage": "S6 피드백 - A",
          "tutor": "(적절한 답변/부적절한 답변/모름) 맞아요. paintbrush가 보여도 행동이 다르면 오답! 사진에 sink, 싱크대 자체도 보이지 않아요. 이렇게 사진 속에 없는 명사가 등장하는 오답 보기도 자주 나와요.",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "ifPicked",
          "path": "ifWrong",
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
          "stage": "S6 오답 제거 - C",
          "tutor": "C에서는 여자가 art gallery를 방문하고 있다고 했는데, 그림을 그리고 있을 뿐 미술관에 방문하는 모습은 확인할 수 없어요.",
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
          "no": 15,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - D",
          "tutor": "D에서는 여자가 물감 튜브를 손에 들고 있다고 했어요. 사진 속 여자가 실제로 holding a tube of paint 하고 있나요?",
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
          "no": 16,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - D",
          "tutor": "맞아요. 물감 튜브를 들고 있지 않으니 D도 제외!",
          "focusQ": 0,
          "optionRef": "D",
          "gate": "ifPicked",
          "tutorIfWrong": "사진 속 여자는 물감 튜브가 아니라 붓을 들고 있어요.",
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
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 0,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 18,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 rinsing a paintbrush는 왜 오답일까요?",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "onDemand",
          "path": "ifCorrect",
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
            "prompt": "A의 rinsing a paintbrush는 왜 오답일까요?",
            "hint": "붓을 헹구는 행동이 아니어서요. / 붓을 잡고 그림을 그리고 있어서요."
          }
        },
        {
          "no": 19,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 rinsing의 원형 rinse는 '헹구다'라는 뜻이에요. 그러면 보기 A는 왜 오답일까요?",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "onDemand",
          "path": "ifWrong",
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
            "prompt": "A의 rinsing의 원형 rinse는 '헹구다'라는 뜻이에요. 그러면 보기 A는 왜 오답일까요?",
            "hint": "붓을 헹구는 행동이 아니어서요. / 붓을 잡고 그림을 그리고 있어서요."
          }
        },
        {
          "no": 20,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - A",
          "tutor": "맞아요. paintbrush가 보여도 행동이 다르면 오답! 사진에 sink, 싱크대 자체도 보이지 않아요. 이렇게 사진 속에 없는 명사가 등장하는 오답 보기도 자주 나와요.",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "onDemand",
          "path": "ifCorrect",
          "tutorIfWrong": "rinse a paintbrush는 '붓을 헹구다'예요. 사진 속 여자는 붓을 헹구는 게 아니라 그림을 그리고 있죠.사진에 sink, 싱크대 자체도 보이지 않아요. 이렇게 사진 속에 없는 명사가 등장하는 오답 보기가 자주 나와요.",
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
          "no": 21,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - A",
          "tutor": "(적절한 답변/부적절한 답변/모름) 맞아요. paintbrush가 보여도 행동이 다르면 오답! 사진에 sink, 싱크대 자체도 보이지 않아요. 이렇게 사진 속에 없는 명사가 등장하는 오답 보기도 자주 나와요.",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "onDemand",
          "path": "ifWrong",
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
          "stage": "S6 오답 제거 - C",
          "tutor": "C에서는 여자가 art gallery를 방문하고 있다고 했는데, 그림을 그리고 있을 뿐 미술관에 방문하는 모습은 확인할 수 없어요.",
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
          "stage": "S6 오답 제거 - D",
          "tutor": "D에서는 여자가 물감 튜브를 손에 들고 있다고 했어요. 사진 속 여자가 실제로 holding a tube of paint 하고 있나요?",
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
          "no": 24,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - D",
          "tutor": "맞아요. 물감 튜브를 들고 있지 않으니 D도 제외!",
          "focusQ": 0,
          "optionRef": "D",
          "gate": "onDemand",
          "tutorIfWrong": "사진 속 여자는 물감 튜브가 아니라 붓을 들고 있어요.",
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
          "no": 25,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S7 표현 정리",
          "tutor": "이제 핵심 정리해볼게요. 인물이 나오는 사진에서는 먼저 인물이 어떤 행동을 하고 있는지 파악하고, 그 행동과 관련된 사물까지 함께 확인​하면 돼요. 이 문제에 나온 어휘 중에서는 rinse, '헹구다', easel, '이젤', tube of paint, '물감 튜브'를 기억해주세요.",
          "focusQ": 0,
          "tip": {
            "body": [
              "• 인물 사진: 인물의 행동 파악하기",
              "• 행동뿐만 아니라 관련된 사물도 함께 확인하기"
            ],
            "vocab": [
              {
                "en": "• rinse:",
                "ko": "헹구다"
              },
              {
                "en": "• easel:",
                "ko": "이젤"
              },
              {
                "en": "• tube of paint:",
                "ko": "물감 튜브"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 26,
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
          "no": 27,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "사진에서 눈에 띄는 사물을 찾아볼게요. 어디에 있고 어떤 상태인지 말해볼까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "subjective",
            "prompt": "사진에서 눈에 띄는 사물을 찾아볼게요. 어디에 있고 어떤 상태인지 말해볼까요?",
            "hint": "신발이 바닥에 줄지어 놓여 있어요. / 옷들이 옷걸이에 걸려 있고 왼쪽에는 핸드백도 걸려 있어요. / 오른쪽 벽에 모자가 두 개 걸려 있어요."
          }
        },
        {
          "no": 28,
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
          "no": 29,
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
          "no": 30,
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
          "no": 31,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "사진 속 사물들을 빠르게 파악하는 게 중요해요. 우선 옷걸이에 여러 벌의 옷이 걸려있고 왼쪽에는 핸드백이 걸려있어요. 바닥에는 신발이 두 켤레 놓여있고 오른쪽 벽에는 모자 두 개도 걸려 있네요.",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 32,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결 - A",
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
          "no": 33,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 피드백 - A",
          "tutor": "Some of the shoes are lined up on the floor이라고 했으니 사진 속 옷걸이 아래에 있는 신발 두 켤레를 정확히 설명하고 있어요.",
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
            "kind": "next"
          }
        },
        {
          "no": 34,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 피드백 - A",
          "tutor": "맞아요! 신발 두 켤레가 바닥에 놓여 있는 모습과 A가 정확히 연결돼요.",
          "focusQ": 1,
          "gate": "ifWrong",
          "tutorIfWrong": "정답은 A예요. 신발 두 켤레가 바닥에 놓여 있는 모습과 A가 정확히 연결돼요.",
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
          "no": 35,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 folded and stacked는 왜 틀렸을까요?",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "ifPicked",
          "path": "ifCorrect",
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
            "prompt": "B의 folded and stacked는 왜 틀렸을까요?",
            "hint": "옷이 접혀 있거나 쌓여 있지 않고 옷걸이에 걸려 있어서요."
          }
        },
        {
          "no": 36,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - B",
          "tutor": "보기 B의 folded and stacked는 '접혀있고 쌓여 있다'는 뜻이에요. 그렇다면 B는 왜 틀렸을까요?",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "ifPicked",
          "path": "ifWrong",
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
            "prompt": "보기 B의 folded and stacked는 '접혀있고 쌓여 있다'는 뜻이에요. 그렇다면 B는 왜 틀렸을까요?",
            "hint": "옷이 접혀 있거나 쌓여 있지 않고 옷걸이에 걸려 있어서요."
          }
        },
        {
          "no": 37,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - B",
          "tutor": "맞아요. 옷들이 접히거나 쌓여있지 않죠. B 제외!",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "ifPicked",
          "tutorIfWrong": "folded and stacked는 '접혀있고 쌓여 있다'는 뜻이에요. 사진 속 옷은 옷걸이에 걸려 있어요.",
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
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 A handbag has been left on top of a basket은 사진과 뭐가 다르죠?",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "ifPicked",
          "path": "ifCorrect",
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
          "no": 39,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - C",
          "tutor": "선택지 C에서는 A hand bag has been left, 핸드백이 놓여 있다, on top of a basket, 바구니 위에, 라고 했어요. 사진 속에 핸드백은 어디에 있나요?",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "ifPicked",
          "path": "ifWrong",
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
            "prompt": "선택지 C에서는 A hand bag has been left, 핸드백이 놓여 있다, on top of a basket, 바구니 위에, 라고 했어요. 사진 속에 핸드백은 어디에 있나요?",
            "hint": "옷걸이에 / 옷걸이에 걸려 있어요."
          }
        },
        {
          "no": 40,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - C",
          "tutor": "정확해요. 이번엔 위치가 안 맞아요. 핸드백은 옷걸이에 걸려있죠.",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "ifPicked",
          "path": "ifCorrect",
          "tutorIfWrong": "has been left는 '놓여 있다', on top of a basket은 '바구니 위에'라는 의미죠. 하지만 핸드백은 바구니 위에 놓여 있지 않아요. 옷걸이에 걸려 있어요.",
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
          "stage": "S6 피드백 - C",
          "tutor": "(적절한 답변 / 부적절한 답변/모름) 사진 가운데 있는 옷걸이에 걸려 있죠. 그래서 오답이에요.",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "ifPicked",
          "path": "ifWrong",
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
          "no": 42,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 are being stored는 '지금 보관되고 있는 중'이라는 뜻이에요. 사진에 모자는 보이는데 누군가 모자를 보관하는 행동이 진행되고 있나요?",
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
            "kind": "choice",
            "prompt": "D의 are being stored는 '지금 보관되고 있는 중'이라는 뜻이에요. 사진에 모자는 보이는데 누군가 모자를 보관하는 행동이 진행되고 있나요?",
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
          "no": 43,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - D",
          "tutor": "맞아요. being이 나오면 실제 행동이 진행 중인지 확인해야 해요. 모자는 벽에 걸려있는 상태니 적절하지 않아요.",
          "focusQ": 1,
          "optionRef": "D",
          "gate": "ifPicked",
          "tutorIfWrong": "모자는 있지만 벽에 걸려있고, 누군가 모자를 보관하는 행동이 진행되고 있진 않죠! 기준 하나만 챙기세요. is/are being p.p.는 그 행동을 하는 사람이 사진에 보여야 정답이에요. 사진에 사람이 없으면 오답이에요.",
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
          "no": 44,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 45,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 folded and stacked는 왜 틀렸을까요?",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "onDemand",
          "path": "ifCorrect",
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
            "prompt": "B의 folded and stacked는 왜 틀렸을까요?",
            "hint": "옷이 접혀 있거나 쌓여 있지 않고 옷걸이에 걸려 있어서요."
          }
        },
        {
          "no": 46,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - B",
          "tutor": "보기 B의 folded and stacked는 '접혀있고 쌓여 있다'는 뜻이에요. 그렇다면 B는 왜 틀렸을까요?",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "onDemand",
          "path": "ifWrong",
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
            "prompt": "보기 B의 folded and stacked는 '접혀있고 쌓여 있다'는 뜻이에요. 그렇다면 B는 왜 틀렸을까요?",
            "hint": "옷이 접혀 있거나 쌓여 있지 않고 옷걸이에 걸려 있어서요."
          }
        },
        {
          "no": 47,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - B",
          "tutor": "맞아요. 옷들이 접히거나 쌓여있지 않죠. B 제외!",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "onDemand",
          "tutorIfWrong": "folded and stacked는 '접혀있고 쌓여 있다'는 뜻이에요. 사진 속 옷은 옷걸이에 걸려 있어요.",
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
          "no": 48,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 A handbag has been left on top of a basket은 사진과 뭐가 다르죠?",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "onDemand",
          "path": "ifCorrect",
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
          "no": 49,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - C",
          "tutor": "선택지 C에서는 A hand bag has been left, 핸드백이 놓여 있다, on top of a basket, 바구니 위에, 라고 했어요. 사진 속에 핸드백은 어디에 있나요?",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "onDemand",
          "path": "ifWrong",
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
            "prompt": "선택지 C에서는 A hand bag has been left, 핸드백이 놓여 있다, on top of a basket, 바구니 위에, 라고 했어요. 사진 속에 핸드백은 어디에 있나요?",
            "hint": "옷걸이에 / 옷걸이에 걸려 있어요."
          }
        },
        {
          "no": 50,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - C",
          "tutor": "정확해요. 이번엔 위치가 안 맞아요. 핸드백은 옷걸이에 걸려있죠.",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "onDemand",
          "path": "ifCorrect",
          "tutorIfWrong": "has been left는 '놓여 있다', on top of a basket은 '바구니 위에'라는 의미죠. 하지만 핸드백은 바구니 위에 놓여 있지 않아요. 옷걸이에 걸려 있어요.",
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
          "no": 51,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - C",
          "tutor": "(적절한 답변 / 부적절한 답변/모름) 사진 가운데 있는 옷걸이에 걸려 있죠. 그래서 오답이에요.",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "onDemand",
          "path": "ifWrong",
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
          "no": 52,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 are being stored는 '지금 보관되고 있는 중'이라는 뜻이에요. 사진에 모자는 보이는데 누군가 모자를 보관하는 행동이 진행되고 있나요?",
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
            "kind": "choice",
            "prompt": "D의 are being stored는 '지금 보관되고 있는 중'이라는 뜻이에요. 사진에 모자는 보이는데 누군가 모자를 보관하는 행동이 진행되고 있나요?",
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
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - D",
          "tutor": "맞아요. being이 나오면 실제 행동이 진행 중인지 확인해야 해요. 모자는 벽에 걸려있는 상태니 적절하지 않아요.",
          "focusQ": 1,
          "optionRef": "D",
          "gate": "onDemand",
          "tutorIfWrong": "모자는 있지만 벽에 걸려있고, 누군가 모자를 보관하는 행동이 진행되고 있진 않죠! 기준 하나만 챙기세요. is/are being p.p.는 그 행동을 하는 사람이 사진에 보여야 정답이에요. 사진에 사람이 없으면 오답이에요.",
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
          "no": 54,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S7 표현 정리",
          "tutor": "이제 핵심 포인트 정리해볼게요. 사물 사진에서는 사진 속 사물의 위치와 상태를 빠르게 확인하는 게 중요해요. 그리고 is/are being p.p.가 나오면 단순히 사물이 보이는 것뿐만 아니라 그 행동이 실제로 진행 중인지 확인해야 해요. 핵심 어휘는 line up, '줄지어 놓다', fold, '접다', stack, '쌓다', store, '보관하다'예요.",
          "focusQ": 1,
          "tip": {
            "body": [
              "• 사물 사진: 사물의 위치와 상태를 빠르게 확인하기",
              "• is/are being p.p.는 사진 속에서 실제로 진행 중인 행동인지 확인하기"
            ],
            "vocab": [
              {
                "en": "• line up:",
                "ko": "줄지어 놓다"
              },
              {
                "en": "• fold:",
                "ko": "접다"
              },
              {
                "en": "• stack:",
                "ko": "쌓다"
              },
              {
                "en": "• store:",
                "ko": "보관하다"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 55,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "마무리 멘트",
          "tutor": "다음으로 넘어갈게요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 56,
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
          "no": 57,
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
          "no": 58,
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
          "no": 59,
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
          "no": 60,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "사진에서 누군가 화분을 정리하는 행동이 보이나요, 아니면 이미 정리된 모습만 보이나요?",
          "focusQ": 2,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "choice",
            "prompt": "사진에서 누군가 화분을 정리하는 행동이 보이나요, 아니면 이미 정리된 모습만 보이나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "진행 중인 행동"
              },
              {
                "text": "이미 되어 있는 상태",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 61,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
          "tutor": "여기서 답이 갈리는 포인트는 하나예요. 진행중인 행동이 보이나요, 아니면 이미 되어 있는 상태가 보이나요? 이 사진은 어느쪽에 해당하나요?",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "이 사진은 어느쪽에 해당하나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "진행 중인 행동"
              },
              {
                "text": "이미 되어 있는 상태",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 62,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 피드백",
          "tutor": "맞아요. 지금 행동이 진행되고 있지 않고 이미 정리된 상태가 보여요.",
          "focusQ": 2,
          "gate": "ifCorrect",
          "tutorIfWrong": "누군가 화분을 옮기는 장면이 아니라, 화분들이 이미 선반에 줄지어 놓여 있는 모습이에요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 63,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 피드백",
          "tutor": "좋아요. 포인트 잡았어요.",
          "focusQ": 2,
          "gate": "ifWrong",
          "tutorIfWrong": "사진에서는 행동이 진행되고 있지 않고 화분이 이미 선반에 줄지어 놓여 있어요. 이걸 기준으로 다시 볼게요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 64,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결 - D",
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
          "no": 65,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결 - D",
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
          "no": 66,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 피드백 - D",
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
          "no": 67,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 are being watered가 왜 오답일까요?",
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
            "kind": "subjective",
            "prompt": "A의 are being watered가 왜 오답일까요?",
            "hint": "물을 주는 행동이 진행 중이지 않아서요."
          }
        },
        {
          "no": 68,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - A",
          "tutor": "맞아요. being이면 진행 중인 행동이 실제로 보여야 해요.",
          "focusQ": 2,
          "optionRef": "A",
          "gate": "ifPicked",
          "tutorIfWrong": "are being watered는 '지금 물을 받고 있는 중'이라는 뜻이에요. 하지만 물을 주는 행동은 안 보여요.",
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
          "no": 69,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - B",
          "tutor": "B에는 삽이란 뜻의 shovel이 등장하죠. 왜 틀렸을까요?",
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
            "kind": "subjective",
            "prompt": "B에는 삽이란 뜻의 shovel이 등장하죠. 왜 틀렸을까요?",
            "hint": "사진에 삽이 보이지 않아서요."
          }
        },
        {
          "no": 70,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - B",
          "tutor": "맞아요. 사진에 일단 삽이 보이지 않죠. 그리고 'A를 B에 기대어 세우다'는 뜻의 prop A against B라는 표현도 기억하세요.",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "ifPicked",
          "tutorIfWrong": "shovel은 '삽', prop A against B는 'A를 B에 기대어 세우다', shed는 '창고'예요. 삽이 창고에 기대어 세워져 있다고 했는데 사진에는 삽 자체가 보이지 않아요.",
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
          "no": 71,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - C",
          "tutor": "C에서 be scattered는 여기저기 흩어져 있다라는 뜻이고, across the ground는 '바닥 여기저기에'라는 의미예요. 그래서 전체적으로는 '큰 잎들이 바닥에 여기저기 흩어져 있다'는 뜻인데, 사진과 맞나요?",
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
            "kind": "choice",
            "prompt": "C에서 be scattered는 여기저기 흩어져 있다라는 뜻이고, across the ground는 '바닥 여기저기에'라는 의미예요. 그래서 전체적으로는 '큰 잎들이 바닥에 여기저기 흩어져 있다'는 뜻인데, 사진과 맞나요?",
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
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - C",
          "tutor": "정확해요. 앞쪽에 잎이 무성한 식물이 보일 뿐이죠.이런 걸 '상태 오답'이라고 해요. 명사는 사진에 있는데 그 상태가 다른 경우예요.",
          "focusQ": 2,
          "optionRef": "C",
          "gate": "ifPicked",
          "tutorIfWrong": "큰 잎들이 바닥에 흩어져 있는 모습은 보이지 않아요. 앞쪽에 잎이 무성한 식물이 보일 뿐이죠. 잎은 사진에 있지만 '흩어져 있다'는 상태가 달라서 오답이에요.",
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
          "no": 73,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 74,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 are being watered가 왜 오답일까요?",
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
            "kind": "subjective",
            "prompt": "A의 are being watered가 왜 오답일까요?",
            "hint": "물을 주는 행동이 진행 중이지 않아서요."
          }
        },
        {
          "no": 75,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - A",
          "tutor": "맞아요. being이면 진행 중인 행동이 실제로 보여야 해요.",
          "focusQ": 2,
          "optionRef": "A",
          "gate": "onDemand",
          "tutorIfWrong": "are being watered는 '지금 물을 받고 있는 중'이라는 뜻이에요. 하지만 물을 주는 행동은 안 보여요.",
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
          "no": 76,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - B",
          "tutor": "B에는 삽이란 뜻의 shovel이 등장하죠. 왜 틀렸을까요?",
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
            "kind": "subjective",
            "prompt": "B에는 삽이란 뜻의 shovel이 등장하죠. 왜 틀렸을까요?",
            "hint": "사진에 삽이 보이지 않아서요."
          }
        },
        {
          "no": 77,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - B",
          "tutor": "맞아요. 사진에 일단 삽이 보이지 않죠. 그리고 'A를 B에 기대어 세우다'는 뜻의 prop A against B라는 표현도 기억하세요.",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "onDemand",
          "tutorIfWrong": "shovel은 '삽', prop A against B는 'A를 B에 기대어 세우다', shed는 '창고'예요. 삽이 창고에 기대어 세워져 있다고 했는데 사진에는 삽 자체가 보이지 않아요.",
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
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - C",
          "tutor": "C에서 be scattered는 여기저기 흩어져 있다라는 뜻이고, across the ground는 '바닥 여기저기에'라는 의미예요. 그래서 전체적으로는 '큰 잎들이 바닥에 여기저기 흩어져 있다'는 뜻인데, 사진과 맞나요?",
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
            "kind": "choice",
            "prompt": "C에서 be scattered는 여기저기 흩어져 있다라는 뜻이고, across the ground는 '바닥 여기저기에'라는 의미예요. 그래서 전체적으로는 '큰 잎들이 바닥에 여기저기 흩어져 있다'는 뜻인데, 사진과 맞나요?",
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
          "no": 79,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - C",
          "tutor": "정확해요. 앞쪽에 잎이 무성한 식물이 보일 뿐이죠.이런 걸 '상태 오답'이라고 해요. 명사는 사진에 있는데 그 상태가 다른 경우예요.",
          "focusQ": 2,
          "optionRef": "C",
          "gate": "onDemand",
          "tutorIfWrong": "큰 잎들이 바닥에 흩어져 있는 모습은 보이지 않아요. 앞쪽에 잎이 무성한 식물이 보일 뿐이죠. 잎은 사진에 있지만 '흩어져 있다'는 상태가 달라서 오답이에요.",
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
          "no": 80,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S7 표현 정리",
          "tutor": "이제 핵심 정리해볼게요. 두 가지 표현 비교해서 볼게요. is/are being p.p.는 '~되고 있는 중'으로 실제 행동이 진행되는 모습을 나타내고, has/have been p.p.는 '이미 ~된 상태'를 나타내요. 사진을 볼 때 이 두 표현의 차이를 구분해서 확인하면 좋아요. 예문도 읽어보고 꼼꼼하게 익히고 넘어가세요. 핵심 표현은 water, '물을 주다', prop A against B, 'A를 B에 기대어 세우다', scatter, '흩어지게 하다'예요.",
          "focusQ": 2,
          "tip": {
            "body": [
              "• is/are being p.p. → ~되고 있는 중",
              "예) The table is being cleaned. → 누군가가 테이블을 청소하고 있는 중",
              "• has/have been p.p. → 이미 ~된 상태",
              "예) The door has been closed. → 문이 이미 닫힌 상태"
            ],
            "vocab": [
              {
                "en": "• water:",
                "ko": "물을 주다"
              },
              {
                "en": "• prop A against B: A",
                "ko": "를 B에 기대어 세우다"
              },
              {
                "en": "• scatter:",
                "ko": "흩어지게 하다"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 81,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "마무리 멘트",
          "tutor": "이제 유형을 익혔으니 실전 문제로 가서 더 연습해봅시다.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        }
      ],
      review: [
        {
          "no": 82,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "사진 속 사람의 행동을 한번 묘사해 볼까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "subjective",
            "prompt": "사진 속 사람의 행동을 한번 묘사해 볼까요?",
            "hint": "- 남자가 있고 컵과 커피 머신이 보여요. - 남자가 컵을 집어 들고 있어요."
          }
        },
        {
          "no": 83,
          "stage": "S5 정답 근거 연결 - D",
          "tutor": "자, 그럼 이제 정답 선택지부터 볼게요. pick up은 '집어 들다'의 뜻이에요. 남자의 실제 행동과 일치하나요?",
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
            "prompt": "자, 그럼 이제 정답 선택지부터 볼게요. pick up은 '집어 들다'의 뜻이에요. 남자의 실제 행동과 일치하나요?",
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
          "no": 84,
          "stage": "S5 피드백 - D",
          "tutor": "맞아요. 사진을 자세히 보면 남자가 오른손으로 빈 컵을 집어 들고 있으니까 He's picking up an empty cup이 사진과 정확히 일치해요.",
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
          "no": 85,
          "stage": "S3 개념 코칭",
          "tutor": "여기서 빈출 포인트 하나 챙기고 갈게요. 옷과 관련되어 자주 나오는 표현 wear과 put on을 잘 구분해야 해요. is wearing은 '이미 입고 있는 상태', is putting on이나 이 문제에 나오는 is tying은 '지금 입고 있는 중', '지금 묶고 있는 중'이에요. 실제 시험에선 보기가 빠르게 넘어가서 생각할 시간이 없으니 미리 익히고 갑시다.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 86,
          "stage": "S6 오답 제거 - A",
          "tutor": "헷갈릴 수 있는 보기에요. A에서 tie an apron은 '앞치마를 매다'라는 뜻이에요. 남자가 지금 앞치마를 매고 있는 중인가요?",
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
            "prompt": "헷갈릴 수 있는 보기에요. A에서 tie an apron은 '앞치마를 매다'라는 뜻이에요. 남자가 지금 앞치마를 매고 있는 중인가요?",
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
          "no": 87,
          "stage": "S6 피드백 - A",
          "tutor": "남자는 앞치마를 이미 입고 있고 매고 있지 않아요.",
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
          "no": 88,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 pour A into B는 'A를 B 안에 붓다'라는 뜻이에요. pour beans into a coffee machine은 커피 머신 안에 원두를 붓는다는 의미죠. 사진 속 행동과 일치하나요?",
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
          "no": 89,
          "stage": "S6 피드백 - B",
          "tutor": "남자는 커피 머신 앞에 있기는 하지만 커피를 내리고 있는 모습처럼 보이고 원두를 붓고 있진 않죠.",
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
          "no": 90,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 hand A to B는 'A를 B에게 건네다'는 뜻이어서 이 문장은 손님에게 음료를 건네고 있다는 의미예요. 남자가 handing a beverage to a customer 하고 있나요?",
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
          "no": 91,
          "stage": "S6 피드백 - C",
          "tutor": "사진 속에는 남자 혼자 있고 손님은 보이지 않아요.",
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
          "no": 92,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 0,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 93,
          "stage": "S6 오답 제거 - A",
          "tutor": "헷갈릴 수 있는 보기에요. A에서 tie an apron은 '앞치마를 매다'라는 뜻이에요. 남자가 지금 앞치마를 매고 있는 중인가요?",
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
            "prompt": "헷갈릴 수 있는 보기에요. A에서 tie an apron은 '앞치마를 매다'라는 뜻이에요. 남자가 지금 앞치마를 매고 있는 중인가요?",
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
          "no": 94,
          "stage": "S6 피드백 - A",
          "tutor": "남자는 앞치마를 이미 입고 있고 매고 있지 않아요.",
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
          "no": 95,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 pour A into B는 'A를 B 안에 붓다'라는 뜻이에요. pour beans into a coffee machine은 커피 머신 안에 원두를 붓는다는 의미죠. 사진 속 행동과 일치하나요?",
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
          "no": 96,
          "stage": "S6 피드백 - B",
          "tutor": "남자는 커피 머신 앞에 있기는 하지만 커피를 내리고 있는 모습처럼 보이고 원두를 붓고 있진 않죠.",
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
          "no": 97,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 hand A to B는 'A를 B에게 건네다'는 뜻이어서 이 문장은 손님에게 음료를 건네고 있다는 의미예요. 남자가 handing a beverage to a customer 하고 있나요?",
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
          "no": 98,
          "stage": "S6 피드백 - C",
          "tutor": "사진 속에는 남자 혼자 있고 손님은 보이지 않아요.",
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
          "no": 99,
          "stage": "S7 표현 정리",
          "tutor": "이제 중요한 팁 정리해볼게요. 옷과 관련된 표현은 '입고 있는 상태'와 '입는 동작'을 구분해야 해요. wear는 '입고 있는 상태', put on은 '입는 동작'을 나타내요. 핵심 어휘는 pick up, '집어 들다', tie an apron, '앞치마를 매다', pour A into B, 'A를 B 안에 붓다', hand A to B, 'A를 B에게 건네다'예요.",
          "focusQ": 0,
          "tip": {
            "body": [
              "• 옷과 관련된 표현은 ‘입고 있는 상태’와 ‘입는 동작’ 구분하기",
              "→ wear: 입고 있는 상태 / put on: 입는 동작"
            ],
            "vocab": [
              {
                "en": "• pick up:",
                "ko": "집어 들다"
              },
              {
                "en": "• tie an apron:",
                "ko": "앞치마를 매다"
              },
              {
                "en": "• pour A into B: A",
                "ko": "를 B 안에 붓다"
              },
              {
                "en": "• hand A to B: A",
                "ko": "를 B에게 건네다"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 100,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "사진 속에 눈에 띄는 사물의 위치와 상태를 말해 볼까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "subjective",
            "prompt": "사진 속에 눈에 띄는 사물의 위치와 상태를 말해 볼까요?",
            "hint": "- 소파와 테이블이 있고 벽에 그림이 걸려 있어요. - 테이블 위에는 책이나 잡지가 있고 화분도 보여요."
          }
        },
        {
          "no": 101,
          "stage": "S5 정답 근거 연결 - A",
          "tutor": "사진 파악 했으면 정답 A부터 볼게요. A의 artwork는 '그림이나 작품 같은 미술품'이고, hang on a wall은 '벽에 걸려 있다'라는 뜻이에요. 사진과 일치하나요?",
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
            "prompt": "사진 파악 했으면 정답 A부터 볼게요. A의 artwork는 '그림이나 작품 같은 미술품'이고, hang on a wall은 '벽에 걸려 있다'라는 뜻이에요. 사진과 일치하나요?",
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
          "no": 102,
          "stage": "S5 피드백 - A",
          "tutor": "사진 속 정면에 보이는 벽에 작품이 걸려 있는게 보이죠.",
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
          "no": 103,
          "stage": "S3 개념 코칭",
          "tutor": "파트 1에서 '걸려 있다'는 두 가지 형태로 표현할 수 있어요. Something is hanging on a wall처럼 '걸려 있는 상태'를 나타낼 수도 있고, Something has been hung on a wall처럼 '누군가에 의해 걸린 상태'를 나타낼 수도 있어요. 둘 다 사진에서 정답으로 나올 수 있으니 함께 익혀두세요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 104,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 reading materials는 책이나 잡지 같은 읽을거리예요. reading materials가 소파 위에 있나요, 테이블 위에 있나요?",
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
            "kind": "choice",
            "prompt": "B의 reading materials는 책이나 잡지 같은 읽을거리예요. reading materials가 소파 위에 있나요, 테이블 위에 있나요?",
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
          "no": 105,
          "stage": "S6 피드백 - B",
          "tutor": "그렇죠. 사진을 자세히 보면 가운데 테이블에 책 같은 게 올려져 있는 걸 볼 수 있어요. 소파에는 쿠션들이 있구요. 그래서 오답입니다.",
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
          "no": 106,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 are being installed는 '지금 설치되고 있는 중'이라는 뜻이에요. 사진에서 창문이 설치되고 있는 중인가요?",
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
          "no": 107,
          "stage": "S6 피드백 - C",
          "tutor": "맞아요. 특히 is/are being p.p.가 나오면 그 사물이 사진에 있는지만 보는 게 아니라, 실제로 그 행동이 진행 중인지 확인해야 해요.",
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
          "no": 108,
          "stage": "S6 오답 제거 - D",
          "tutor": "D에서는 potted plants, 즉 화분에 심긴 식물들이 have fallen on the floor 바닥에 넘어져 있다고 했는데 그런 모습이 전혀 보이지 않아요. 그래서 오답이에요.",
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
          "no": 109,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 110,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 reading materials는 책이나 잡지 같은 읽을거리예요. reading materials가 소파 위에 있나요, 테이블 위에 있나요?",
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
            "kind": "choice",
            "prompt": "B의 reading materials는 책이나 잡지 같은 읽을거리예요. reading materials가 소파 위에 있나요, 테이블 위에 있나요?",
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
          "no": 111,
          "stage": "S6 피드백 - B",
          "tutor": "그렇죠. 사진을 자세히 보면 가운데 테이블에 책 같은 게 올려져 있는 걸 볼 수 있어요. 소파에는 쿠션들이 있구요. 그래서 오답입니다.",
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
          "no": 112,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 are being installed는 '지금 설치되고 있는 중'이라는 뜻이에요. 사진에서 창문이 설치되고 있는 중인가요?",
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
          "no": 113,
          "stage": "S6 피드백 - C",
          "tutor": "맞아요. 특히 is/are being p.p.가 나오면 그 사물이 사진에 있는지만 보는 게 아니라, 실제로 그 행동이 진행 중인지 확인해야 해요.",
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
          "no": 114,
          "stage": "S6 오답 제거 - D",
          "tutor": "D에서는 potted plants, 즉 화분에 심긴 식물들이 have fallen on the floor 바닥에 넘어져 있다고 했는데 그런 모습이 전혀 보이지 않아요. 그래서 오답이에요.",
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
          "no": 115,
          "stage": "S7 표현 정리",
          "tutor": "여기서 중요한 포인트 정리하고 넘어갈게요. '걸려 있다'는 is hanging이나 has been hung으로 표현할 수 있었어요. 그리고 유형 학습에서 다뤘듯이 is/are being p.p.가 나오면 실제로 그 행동을 하고 있는 모습이 보이는지 확인하면 돼요. 예를 들어 The chairs are being moved면 의자를 옮기는 중인지, The wall is being painted면 벽을 칠하는 중인지 확인해야 해요.",
          "focusQ": 1,
          "tip": {
            "body": [
              "• 걸려 있다 → is hanging / has been hung",
              "• is/are being p.p. → 실제로 ~하는 모습이 보이는지 확인",
              "예) The chairs are being moved. → 의자를 옮기는 중",
              "예) The wall is being painted. → 벽을 칠하는 중"
            ],
            "vocab": [
              {
                "en": "• artwork:",
                "ko": "미술품"
              },
              {
                "en": "• reading materials:",
                "ko": "읽을거리"
              },
              {
                "en": "• install:",
                "ko": "설치하다"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 116,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "사진 속 두 사람이 취하고 있는 자세나 행동을 묘사해 볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "subjective",
            "prompt": "사진 속 두 사람이 취하고 있는 자세나 행동을 묘사해 볼까요?",
            "hint": "- 여자 두 명이 있고 유리 진열대와 쇼핑 카트가 보여요. - 한 여자는 진열대 쪽에 팔을 올리고 있어요."
          }
        },
        {
          "no": 117,
          "stage": "S5 정답 근거 연결 - B",
          "tutor": "그럼 정답 B부터 볼게요. B에서는 resting her arm on a glass counter라고 했어요. 여기서 rest one's arm on ~은 '팔을 ~에 기대거나 올려두다'라는 뜻이에요. 사진 속 두 여성 중 한 명의 자세와 일치하나요?",
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
            "prompt": "그럼 정답 B부터 볼게요. B에서는 resting her arm on a glass counter라고 했어요. 여기서 rest one's arm on ~은 '팔을 ~에 기대거나 올려두다'라는 뜻이에요. 사진 속 두 여성 중 한 명의 자세와 일치하나요?",
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
          "no": 118,
          "stage": "S5 피드백 - B",
          "tutor": "좋아요. 왼쪽 여성 모습과 일치하죠. rest를 무조건 '쉬다'로만 보면 안 돼요. 'rest + 신체 부위 + on~' 처럼 쓰이면 '신체 부위를 ~에 기대거나 올려두다'라는 의미가 되니 기억해두세요.",
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
          "no": 119,
          "stage": "S3 개념 코칭",
          "tutor": "이 문제처럼 사람이 여러 명 나오면 각 사람의 행동과 자세를 각각 빠르게 확인해 보세요. 그리고 이 문제에서는 선택지 모두 주어가 one of the women여서 괜찮았는데 선택지마다 각각 다를 수도 있으니 주어를 정확히 확인하면서 들어야 해요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 120,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 reach into는 '~안으로 손을 뻗다'라는 뜻이에요. 한 여성이 쇼핑 카트 안으로 reach into 하고 있나요?",
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
            "kind": "choice",
            "prompt": "A의 reach into는 '~안으로 손을 뻗다'라는 뜻이에요. 한 여성이 쇼핑 카트 안으로 reach into 하고 있나요?",
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
          "no": 121,
          "stage": "S6 피드백 - A",
          "tutor": "쇼핑 카트쪽에 있는 여성은 아까 말했듯 진열장에 팔을 올려두고 있고 오른쪽 여성은 쇼핑 카트가 아닌 진열장 안으로 손을 뻗고 있어요. 잘 듣고 판단해야 해요.",
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
          "no": 122,
          "stage": "S6 오답 제거 - C",
          "tutor": "C에서는 여성이 계산대의 버튼을 누르고 있다고 했어요. 오른쪽 여성은 계산대 버튼을 누르고 있나요? 아니면 진열장에서 무언가를 집고 있는 것 같아 보이나요?",
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
          "no": 123,
          "stage": "S6 피드백 - C",
          "tutor": "그쵸! 일단 계산대가 보이지 않아요.",
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
          "no": 124,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 display case는 상품을 넣어 보여주는 진열장이에요. display case만 듣고 정답이라고 생각하기 쉬워요. 그런데 여성이 정말 display case를 열고 있나요?",
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
            "kind": "choice",
            "prompt": "D의 display case는 상품을 넣어 보여주는 진열장이에요. display case만 듣고 정답이라고 생각하기 쉬워요. 그런데 여성이 정말 display case를 열고 있나요?",
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
          "no": 125,
          "stage": "S6 피드백 - D",
          "tutor": "그렇죠. 열고 있진 않아요. 진열장에서 무언가를 꺼내는 것처럼 보여요. 충분히 헷갈릴 수 있는 보기였어요.",
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
          "no": 126,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 127,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 reach into는 '~안으로 손을 뻗다'라는 뜻이에요. 한 여성이 쇼핑 카트 안으로 reach into 하고 있나요?",
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
            "kind": "choice",
            "prompt": "A의 reach into는 '~안으로 손을 뻗다'라는 뜻이에요. 한 여성이 쇼핑 카트 안으로 reach into 하고 있나요?",
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
          "no": 128,
          "stage": "S6 피드백 - A",
          "tutor": "쇼핑 카트쪽에 있는 여성은 아까 말했듯 진열장에 팔을 올려두고 있고 오른쪽 여성은 쇼핑 카트가 아닌 진열장 안으로 손을 뻗고 있어요. 잘 듣고 판단해야 해요.",
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
          "no": 129,
          "stage": "S6 오답 제거 - C",
          "tutor": "C에서는 여성이 계산대의 버튼을 누르고 있다고 했어요. 오른쪽 여성은 계산대 버튼을 누르고 있나요? 아니면 진열장에서 무언가를 집고 있는 것 같아 보이나요?",
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
          "no": 130,
          "stage": "S6 피드백 - C",
          "tutor": "그쵸! 일단 계산대가 보이지 않아요.",
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
          "no": 131,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 display case는 상품을 넣어 보여주는 진열장이에요. display case만 듣고 정답이라고 생각하기 쉬워요. 그런데 여성이 정말 display case를 열고 있나요?",
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
            "kind": "choice",
            "prompt": "D의 display case는 상품을 넣어 보여주는 진열장이에요. display case만 듣고 정답이라고 생각하기 쉬워요. 그런데 여성이 정말 display case를 열고 있나요?",
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
          "no": 132,
          "stage": "S6 피드백 - D",
          "tutor": "그렇죠. 열고 있진 않아요. 진열장에서 무언가를 꺼내는 것처럼 보여요. 충분히 헷갈릴 수 있는 보기였어요.",
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
          "no": 133,
          "stage": "S7 표현 정리",
          "tutor": "핵심 정리할게요. 사람이 여러 명 나오는 사진에서는 한 명씩 행동과 자세를 확인하는 게 중요해요. 선택지를 들을 때도 누가, 무엇을, 어디에서 하고 있는지를 같이 확인하면 헷갈리지 않아요. 핵심 표현은 reach into, '~ 안으로 손을 뻗다', rest one's arm on, '팔을 ~에 기대다'예요.",
          "focusQ": 2,
          "tip": {
            "body": [
              "• 사람이 여러 명이면 한 명씩 행동과 자세 확인하기",
              "• 선택지 들으며 누가 + 무엇을 + 어디에서 하는지 확인하기"
            ],
            "vocab": [
              {
                "en": "• reach into~:",
                "ko": "~ 안으로 손을 뻗다"
              },
              {
                "en": "• rest one’s arm on~:",
                "ko": "팔을 ~에 기대다"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 134,
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
          "no": 135,
          "stage": "S5 정답 근거 연결 - C",
          "tutor": "자, 그럼 이제 정답 C부터 봅시다. partition은 '칸막이'고, be divided with ~는 '~로 나뉘어 있다'라는 뜻이에요. 사진에서 책상 공간이 partition으로 divide 되어 있나요?",
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
            "prompt": "자, 그럼 이제 정답 C부터 봅시다. partition은 '칸막이'고, be divided with ~는 '~로 나뉘어 있다'라는 뜻이에요. 사진에서 책상 공간이 partition으로 divide 되어 있나요?",
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
          "no": 136,
          "stage": "S5 피드백 - C",
          "tutor": "그렇죠. 책상마다 칸막이가 있는걸 확인할 수 있죠.",
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
          "no": 137,
          "stage": "S3 개념 코칭",
          "tutor": "이 문제에서는 has/have been p.p.와 is/are being p.p. 표현이 쓰였어요. 현재 진행형보다 들었을 때 즉각적으로 파악하기 쉽지 않으니 반복해서 익혀둡시다. 사물이 존재하는 것과 그 행동이 실제로 진행되는 것은 달라요. 특히 is/are being p.p.가 나오면 그 행동이 진행 중인지 꼭 확인하세요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 138,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 Trash bins are being emptied는 '쓰레기통들이 지금 비워지고 있는 중이다'라는 뜻이에요. 사진에 쓰레기통은 보이지만 실제로 비워지고 있나요?",
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
          "no": 139,
          "stage": "S6 피드백 - A",
          "tutor": "누군가가 쓰레기통을 비우고 있는 모습은 전혀 보이지 않아요.",
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
          "no": 140,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 along a wall은 '벽을 따라서'라는 뜻이에요. 사진 속 의자는 어떻게 놓여 있죠?",
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
            "kind": "subjective",
            "prompt": "B의 along a wall은 '벽을 따라서'라는 뜻이에요. 사진 속 의자는 어떻게 놓여 있죠?",
            "hint": "책상 앞에 놓여 있어요."
          }
        },
        {
          "no": 141,
          "stage": "S6 피드백 - B",
          "tutor": "그렇죠. 의자가 사진에 있다는 것만 확인하는 게 아니라, 실제로 벽을 따라 놓여 있는지까지 살펴봐야 해요.",
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
          "no": 142,
          "stage": "S6 오답 제거 - D",
          "tutor": "D에는 a stack of documents, '서류 한 더미', workstation, '업무 공간'이라는 단어가 나와요. 각 업무 공간마다 서류 더미가 있다고 했어요. 사진과 맞나요?",
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
            "kind": "choice",
            "prompt": "D에는 a stack of documents, '서류 한 더미', workstation, '업무 공간'이라는 단어가 나와요. 각 업무 공간마다 서류 더미가 있다고 했어요. 사진과 맞나요?",
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
          "no": 143,
          "stage": "S6 피드백 - D",
          "tutor": "사진에서는 서류 더미 자체가 보이지 않죠.",
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
          "no": 144,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 3,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 설명을 듣고 싶은 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 145,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 Trash bins are being emptied는 '쓰레기통들이 지금 비워지고 있는 중이다'라는 뜻이에요. 사진에 쓰레기통은 보이지만 실제로 비워지고 있나요?",
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
          "no": 146,
          "stage": "S6 피드백 - A",
          "tutor": "누군가가 쓰레기통을 비우고 있는 모습은 전혀 보이지 않아요.",
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
          "no": 147,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 along a wall은 '벽을 따라서'라는 뜻이에요. 사진 속 의자는 어떻게 놓여 있죠?",
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
            "kind": "subjective",
            "prompt": "B의 along a wall은 '벽을 따라서'라는 뜻이에요. 사진 속 의자는 어떻게 놓여 있죠?",
            "hint": "책상 앞에 놓여 있어요."
          }
        },
        {
          "no": 148,
          "stage": "S6 피드백 - B",
          "tutor": "그렇죠. 의자가 사진에 있다는 것만 확인하는 게 아니라, 실제로 벽을 따라 놓여 있는지까지 살펴봐야 해요.",
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
          "no": 149,
          "stage": "S6 오답 제거 - D",
          "tutor": "D에는 a stack of documents, '서류 한 더미', workstation, '업무 공간'이라는 단어가 나와요. 각 업무 공간마다 서류 더미가 있다고 했어요. 사진과 맞나요?",
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
            "kind": "choice",
            "prompt": "D에는 a stack of documents, '서류 한 더미', workstation, '업무 공간'이라는 단어가 나와요. 각 업무 공간마다 서류 더미가 있다고 했어요. 사진과 맞나요?",
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
          "no": 150,
          "stage": "S6 피드백 - D",
          "tutor": "사진에서는 서류 더미 자체가 보이지 않죠.",
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
          "no": 151,
          "stage": "S7 표현 정리",
          "tutor": "이제 핵심 정리해 볼게요. 사물 사진에서는 어떤 사물이 있는지만 보는 게 아니라, 사물의 위치와 배치까지 구체적으로 확인하는 게 중요해요. 오늘 나온 표현 중에서는 along a wall, '벽을 따라서', partition, '칸막이', a stack of documents, '서류 한 더미'를 잘 기억해 두세요.",
          "focusQ": 3,
          "tip": {
            "body": [
              "• 사물의 위치와 배치까지 구체적으로 확인하기"
            ],
            "vocab": [
              {
                "en": "• along a wall:",
                "ko": "벽을 따라서"
              },
              {
                "en": "• partition:",
                "ko": "칸막이"
              },
              {
                "en": "• a stack of documents:",
                "ko": "서류 한 더미"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        }
      ],
    },
    'RC-P5-08': {
      intro: {
        "script": "이번에는 토익 Part 5에서 자주 만나는 능동태와 수동태 문제를 살펴볼게요.\n능동태와 수동태 문제는 빈칸에 들어갈 동사의 형태를 고르는 문제인데요.\n문장을 읽으면서 주어가 행동하는지, 행동을 받는지 판단하는 것이 중요합니다.\n특히 비슷한 동사 형태가 보기로 나오는 경우가 많아서, 문장의 의미와 구조를 함께 봐야 해요.\n그럼 실제 토익 문제에서 어떻게 나오는지 볼게요.",
        "points": [
          "능동태와 수동태 구분하기",
          "시제와 주어의 수에 맞는 동사 형태 고르기"
        ]
      },
      summary: [
        {
          "title": "Part 5 능동태·수동태 핵심 정리",
          "intro": "오늘 배운 내용을 빠르게 정리해 볼게요. 빈칸에 들어갈 말을 채우면서 이번 강의에서 배운 핵심 내용을 다시 확인해 보세요!",
          "items": [
            {
              "id": "s1_1",
              "head": "주어가 직접 행동하는지, 행동을 받는지 확인하기",
              "en": "• The manager ___ the report every Friday.\n해석: 관리자는 매주 금요일 보고서를 작성한다.\n- 주어가 직접 행동하면 능동태\n- 주어가 행동을 받으면 수동태",
              "ko": "맞아요! 여기서는 관리자가 보고서를 직접 작성하고 있으니까 능동태이고, 매주 금요일에 반복적으로 작성한다고 했으니 현재형 writes가 들어가야 해요.",
              "answer": "writes",
              "choices": [],
              "keywords": [
                "writes"
              ]
            },
            {
              "id": "s1_2",
              "head": "빈칸 뒤에 목적어가 있는지 확인하기",
              "en": "• The report ___ every Friday.\n해석: 그 보고서는 매주 금요일 작성된다.\n- 빈칸 뒤에 목적어가 없음\n- 주어가 행동을 받으므로 수동태",
              "ko": "정답이에요! 여기서는 주어인 보고서가 작성하는 게 아니라 작성되는 대상이니까 수동태이고, 매주 금요일에 작성된다고 했으니 현재형 is written이 들어가야 해요.",
              "answer": "is written",
              "choices": [],
              "keywords": [
                "is written"
              ]
            },
            {
              "id": "s1_3",
              "head": "시제 단서 확인하기",
              "en": "• The report ___ by the manager last week.\n해석: 그 보고서는 지난주에 관리자에 의해 작성되었다.\n- last week가 과거 시제 단서\n- 주어인 The report는 행동을 받으므로 수동태",
              "ko": "맞아요! 여기서는 주어인 보고서가 작성되는 대상이니까 수동태이고, last week라는 과거 시제 단서가 있으니 과거형 was written이 들어가야 해요.",
              "answer": "was written",
              "choices": [],
              "keywords": [
                "was written"
              ]
            },
            {
              "id": "s1_4",
              "head": "주어의 수 확인하기",
              "en": "• The boxes of equipment ___ delivered every Monday.\n해석: 장비 상자들은 매주 월요일 배송된다.\n- of + 명사에 속지 말고 핵심 주어의 수 확인",
              "ko": "정답이에요! 여기서는 equipment에 맞출 것이 아니라 핵심 주어인 The boxes에 맞춰야 해요. boxes가 복수이기 때문에 are이 들어가야 해요.",
              "answer": "are",
              "choices": [],
              "keywords": [
                "are"
              ]
            },
            {
              "id": "s1_5",
              "head": "진행 중인 수동태인지 확인하기",
              "en": "• The building ___ repaired now.\n해석: 건물이 지금 수리되고 있는 중이다.\n- '~되고 있는 중'이면 be + being + p.p. 형태",
              "ko": "맞아요! 여기서는 건물이 지금 수리되는 중이라고 했으니까 진행 수동태이고, be + being + p.p. 형태인 is being이 들어가야 해요.",
              "answer": "is being",
              "choices": [],
              "keywords": [
                "is being"
              ]
            }
          ]
        },
        {
          "title": "핵심 빈출 표현 정리",
          "intro": "마지막으로 오늘 문제에서 나온 토익 빈출 표현 확인해 볼게요. 영어 표현을 보고 알맞은 뜻을 골라보세요.",
          "items": [
            {
              "id": "s2_1",
              "en": "standardize = ___",
              "ko": "수고했어요! 오늘 수업에서 다룬 주요 어휘를 모두 확인했어요. 헷갈렸던 표현은 뜻이 바로 떠오를 수 있도록 한 번 더 복습해 두세요.",
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
          "stage": "S5 정답 근거 연결 - B",
          "tutor": "이 기준으로 답 다시 골라볼게요.",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 0
          }
        },
        {
          "no": 9,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 피드백 - B",
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
          "no": 10,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 are standardizing은 왜 틀릴까요?",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "ifPicked",
          "path": "ifCorrect",
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
            "hint": "부품이 표준화하는 의미가 되어서요. / 능동의 의미가 되어서요."
          }
        },
        {
          "no": 11,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 are standardizing은 수동태인가요, 능동태인가요?",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "ifPicked",
          "path": "ifWrong",
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
            "prompt": "A의 are standardizing은 수동태인가요, 능동태인가요?",
            "hint": "능동태"
          }
        },
        {
          "no": 12,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - A",
          "tutor": "맞아요. 수동태가 들어가야 한다 했으니 능동태는 쓸 수 없죠. A 제외!",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "ifPicked",
          "tutorIfWrong": "are standardizing은 '표준화하고 있다'는 능동태에요. 그러면 부품이 직접 행동하는 주체가 돼서 이 문장과 안 맞아요.",
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
          "tutor": "C의 standardizes는 그 자체로 현재형 동사라 앞의 are와 바로 이어 쓸 수 없어요. C는 바로 제외!",
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
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 standardization의 품사는 무엇인가요?",
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
            "kind": "choice",
            "prompt": "D의 standardization의 품사는 무엇인가요?",
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
          "no": 15,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - D",
          "tutor": "그렇죠. be동사 + 명사 구조 자체는 가능하지만, 여기서는 부품들이 '표준화되어 있다'는 의미가 필요하므로 D는 맞지 않아요.",
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
          "no": 16,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
          "focusQ": 0,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 17,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 are standardizing은 왜 틀릴까요?",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "onDemand",
          "path": "ifCorrect",
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
            "hint": "부품이 표준화하는 의미가 되어서요. / 능동의 의미가 되어서요."
          }
        },
        {
          "no": 18,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 are standardizing은 수동태인가요, 능동태인가요?",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "onDemand",
          "path": "ifWrong",
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
            "prompt": "A의 are standardizing은 수동태인가요, 능동태인가요?",
            "hint": "능동태"
          }
        },
        {
          "no": 19,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - A",
          "tutor": "맞아요. 수동태가 들어가야 한다 했으니 능동태는 쓸 수 없죠. A 제외!",
          "focusQ": 0,
          "optionRef": "A",
          "gate": "onDemand",
          "tutorIfWrong": "are standardizing은 '표준화하고 있다'는 능동태에요. 그러면 부품이 직접 행동하는 주체가 돼서 이 문장과 안 맞아요.",
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
          "no": 20,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 standardizes는 그 자체로 현재형 동사라 앞의 are와 바로 이어 쓸 수 없어요. C는 바로 제외!",
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
          "no": 21,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 standardization의 품사는 무엇인가요?",
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
            "kind": "choice",
            "prompt": "D의 standardization의 품사는 무엇인가요?",
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
          "no": 22,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 피드백 - D",
          "tutor": "그렇죠. be동사 + 명사 구조 자체는 가능하지만, 여기서는 부품들이 '표준화되어 있다'는 의미가 필요하므로 D는 맞지 않아요.",
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
          "no": 23,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S7 표현 정리",
          "tutor": "이제 핵심 정리해볼게요. be동사 뒤에 -ing와 p.p.가 보기로 나오면 주어가 직접 행동하는지 먼저 확인하면 돼요. 예를 들어 Julie is cleaning the table은 사람이 직접 청소하는 거니까ing형태, The table is cleaned는 테이블이 청소를 받는 거니까 p.p.형태를 써요. 중요 어휘는 component part, '부품', standardize, '표준화하다', replacement, '교체'예요.",
          "focusQ": 0,
          "tip": {
            "body": [
              "• be동사 + -ing? / p.p.? → 주어가 행동하는지 확인하기",
              "- 사람이 직접 행동함: Julie is cleaning the table.",
              "- 사물이 행동을 받음: The table is cleaned."
            ],
            "vocab": [
              {
                "en": "• component part:",
                "ko": "부품"
              },
              {
                "en": "• standardize:",
                "ko": "표준화하다"
              },
              {
                "en": "• replacement:",
                "ko": "교체"
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
          "stage": "마무리 멘트",
          "tutor": "이제 다음 문제로 넘어갈게요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 25,
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
          "no": 26,
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
          "no": 27,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "채점",
          "tutor": "정답이에요! 포인트만 딱딱 짚고 넘어갈게요.",
          "focusQ": 1,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 28,
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
          "no": 29,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "주어인 The settings는 직접 변경하는 쪽일까요, 변경되는 대상일까요?",
          "focusQ": 1,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "choice",
            "prompt": "주어인 The settings는 직접 변경하는 쪽일까요, 변경되는 대상일까요?",
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
          "no": 30,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 개념 코칭",
          "tutor": "빈칸 뒤에 by any user가 있죠. The settings가 사용자를 변경하는 걸까요, 사용자에 의해 변경되는 걸까요?",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "빈칸 뒤에 by any user가 있죠. The settings가 사용자를 변경하는 걸까요, 사용자에 의해 변경되는 걸까요?",
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
          "no": 31,
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
          "no": 32,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S3 피드백",
          "tutor": "좋아요. 변경되는 대상이면 수동! 방향 잡았어요.",
          "focusQ": 1,
          "gate": "ifWrong",
          "tutorIfWrong": "by any user이 힌트예요. settings는 행동하는 쪽이 아니라 변경되는 대상이니까 수동태가 필요해요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 33,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결 - D",
          "tutor": "자, 이제 답 다시 골라볼게요.",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 1
          }
        },
        {
          "no": 34,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 피드백 - D",
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
          "no": 35,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - A",
          "tutor": "cannot 같은 조동사 뒤에는 동사원형이 바로 와야하므로 to alter이 될 수 없어요.",
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
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 cannot alter은 형태상 가능하죠. 그런데 이 문장에서는 왜 안 맞을까요?",
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
            "kind": "subjective",
            "prompt": "B의 cannot alter은 형태상 가능하죠. 그런데 이 문장에서는 왜 안 맞을까요?",
            "hint": "settings가 직접 변경하는 의미가 돼서요. / 능동태가 되어서 틀려요. / 수동태가 들어가야 해서요."
          }
        },
        {
          "no": 37,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - B",
          "tutor": "정확해요. 형태는 가능하지만 이 문장에서 능동태는 의미상 적절하지 않죠.",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "ifPicked",
          "tutorIfWrong": "cannot alter이면 settings가 직접 무언가를 변경할 수 없다는 능동 의미가 돼요. 여기서 settings는 변경되는 대상의 의미니까 능동태 쓸 수 없어요.",
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
          "stage": "S6 오답 제거 - C",
          "tutor": "C를 넣어 cannot altering으로 쓸 수 있나요?",
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
            "prompt": "C를 넣어 cannot altering으로 쓸 수 있나요?",
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
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - C",
          "tutor": "맞아요. 조동사 뒤에 -ing는 바로 올 수 없어요. C도 제외!",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "ifPicked",
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
          "no": 40,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 41,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - A",
          "tutor": "cannot 같은 조동사 뒤에는 동사원형이 바로 와야하므로 to alter이 될 수 없어요.",
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
          "no": 42,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 cannot alter은 형태상 가능하죠. 그런데 이 문장에서는 왜 안 맞을까요?",
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
            "kind": "subjective",
            "prompt": "B의 cannot alter은 형태상 가능하죠. 그런데 이 문장에서는 왜 안 맞을까요?",
            "hint": "settings가 직접 변경하는 의미가 돼서요. / 능동태가 되어서 틀려요. / 수동태가 들어가야 해서요."
          }
        },
        {
          "no": 43,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - B",
          "tutor": "정확해요. 형태는 가능하지만 이 문장에서 능동태는 의미상 적절하지 않죠.",
          "focusQ": 1,
          "optionRef": "B",
          "gate": "onDemand",
          "tutorIfWrong": "cannot alter이면 settings가 직접 무언가를 변경할 수 없다는 능동 의미가 돼요. 여기서 settings는 변경되는 대상의 의미니까 능동태 쓸 수 없어요.",
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
          "no": 44,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 - C",
          "tutor": "C를 넣어 cannot altering으로 쓸 수 있나요?",
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
            "prompt": "C를 넣어 cannot altering으로 쓸 수 있나요?",
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
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 피드백 - C",
          "tutor": "맞아요. 조동사 뒤에 -ing는 바로 올 수 없어요. C도 제외!",
          "focusQ": 1,
          "optionRef": "C",
          "gate": "onDemand",
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
          "no": 46,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S7 표현 정리",
          "tutor": "이 문제의 핵심은 조동사 뒤에 오는 동사의 형태였어요. 조동사 뒤에는 기본적으로 동사원형이 오는데 주어가 행동을 받는 경우에는 be동사와 과거분사를 사용해서 수동태로 만들어요. 따라서 주어가 직접 행동하는지, 아니면 행동을 받는지를 먼저 확인하면 됩니다. 오늘 나온 어휘 중에서는 virtual, '가상의', digit, '자릿수', alter, '변경하다'를 익혀두세요.",
          "focusQ": 1,
          "tip": {
            "body": [
              "• 조동사 + 동사원형 → 주어가 직접 행동",
              "예) You can change the schedule. (일정을 변경할 수 있다.)",
              "• 조동사 + be + p.p. → 주어가 행동을 받음",
              "예) The schedule can be changed. (일정이 변경될 수 있다.)"
            ],
            "vocab": [
              {
                "en": "• virtual:",
                "ko": "가상의"
              },
              {
                "en": "• digit:",
                "ko": "자릿수"
              },
              {
                "en": "• alter:",
                "ko": "변경하다"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 47,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "마무리 멘트",
          "tutor": "다음 문제로 넘어갈게요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 48,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S2 유형·역할 판별",
          "tutor": "When절 뒤, Ms. Levy로 시작하는 주절에 동사가 없으니 빈칸은 동사 자리임을 알 수 있어요. 그리고 빈칸 바로 뒤에 동사의 대상이 되는 표현이 있어요. 동그라미 쳐볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "mark",
            "prompt": "When절 뒤, Ms. Levy로 시작하는 주절에 동사가 없으니 빈칸은 동사 자리임을 알 수 있어요. 그리고 빈칸 바로 뒤에 동사의 대상이 되는 표현이 있어요. 동그라미 쳐볼까요?",
            "targetWords": [
              "team"
            ]
          }
        },
        {
          "no": 49,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "학생 풀이",
          "tutor": "좋아요. 이 목적어 단서 먼저 잡고 한번 풀어볼게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 2
          }
        },
        {
          "no": 50,
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
          "no": 51,
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
          "no": 52,
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
          "no": 53,
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
          "no": 54,
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
          "no": 55,
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
          "no": 56,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 개념 코칭",
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
          "no": 57,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S3 피드백",
          "tutor": "맞아요. took over가 과거 사건을 보여주죠. when절 뒤의 주절도 같은 과거 상황을 설명하고 있어요.",
          "focusQ": 2,
          "tutorIfWrong": "took over가 과거형이에요. 프로젝트를 맡았던 당시의 일을 설명하고 있으니 빈칸도 과거형이 자연스러워요.",
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 58,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결 - A",
          "tutor": "그래서 능동 + 과거를 모두 만족하는 directed가 정답이에요.",
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
          "no": 59,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결 - A",
          "tutor": "좋아요. 능동이고 과거여야 한다, 이 두 기준으로 답 다시 골라볼게요.",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 2
          }
        },
        {
          "no": 60,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 피드백 - A",
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
          "no": 61,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 direct는 왜 오답일까요?",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "ifPicked",
          "path": "ifCorrect",
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
          "no": 62,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 direct는 과거 시제, 현재 시제 중 어떤 것인가요?",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "ifPicked",
          "path": "ifWrong",
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
            "prompt": "B의 direct는 과거 시제, 현재 시제 중 어떤 것인가요?",
            "hint": "현재 시제 / 현재"
          }
        },
        {
          "no": 63,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - B",
          "tutor": "(적절한 답변/부적절한 답변/모름) 형태는 능동이라 적절하지만 과거 시제가 필요하니 현재 시제 B는 오답이에요.",
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
          "no": 64,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 is directing은 현재진행형이고 앞의 took over가 보여주는 과거 상황과 맞지 않아서 C는 정답이 아니에요.",
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
          "no": 65,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 was directed를 넣으면 Ms. Levy가 지시하는 사람이 되나요, 지시 받는 사람이 되나요?",
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
            "kind": "choice",
            "prompt": "D의 was directed를 넣으면 Ms. Levy가 지시하는 사람이 되나요, 지시 받는 사람이 되나요?",
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
          "no": 66,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - D",
          "tutor": "맞아요. 그래서 적절하지 않죠. D도 제외!",
          "focusQ": 2,
          "optionRef": "D",
          "gate": "ifPicked",
          "tutorIfWrong": "was directed와 같은 수동태는 들어갈 수 없죠. 능동태가 필요해요.",
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
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 68,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 direct는 왜 오답일까요?",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "onDemand",
          "path": "ifCorrect",
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
          "no": 69,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 direct는 과거 시제, 현재 시제 중 어떤 것인가요?",
          "focusQ": 2,
          "optionRef": "B",
          "gate": "onDemand",
          "path": "ifWrong",
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
            "prompt": "B의 direct는 과거 시제, 현재 시제 중 어떤 것인가요?",
            "hint": "현재 시제 / 현재"
          }
        },
        {
          "no": 70,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - B",
          "tutor": "(적절한 답변/부적절한 답변/모름) 형태는 능동이라 적절하지만 과거 시제가 필요하니 현재 시제 B는 오답이에요.",
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
          "no": 71,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 is directing은 현재진행형이고 앞의 took over가 보여주는 과거 상황과 맞지 않아서 C는 정답이 아니에요.",
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
          "no": 72,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 was directed를 넣으면 Ms. Levy가 지시하는 사람이 되나요, 지시 받는 사람이 되나요?",
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
            "kind": "choice",
            "prompt": "D의 was directed를 넣으면 Ms. Levy가 지시하는 사람이 되나요, 지시 받는 사람이 되나요?",
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
          "no": 73,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 피드백 - D",
          "tutor": "맞아요. 그래서 적절하지 않죠. D도 제외!",
          "focusQ": 2,
          "optionRef": "D",
          "gate": "onDemand",
          "tutorIfWrong": "was directed와 같은 수동태는 들어갈 수 없죠. 능동태가 필요해요.",
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
          "no": 74,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S7 표현 정리",
          "tutor": "여기서 중요한 포인트 정리하고 넘어갈게요. 빈칸 뒤에 목적어가 있는지 확인하고, 주어가 직접 행동하는지를 판단하는 게 중요해요. 그리고 앞뒤에 나오는 시제 단서를 통해 빈칸의 시제까지 확인하면 됩니다. 핵심 표현은 direct A to V, 'A에게 ~하도록 지시하다', take over, '맡다, 인수하다', progress update, '진행 상황 보고'예요.",
          "focusQ": 2,
          "tip": {
            "body": [
              "• 빈칸 뒤에 목적어가 보이면 → 주어가 직접 행동하는지 확인하기",
              "예) Tom(주어) opened(동사) the door(목적어).",
              "• 앞뒤의 시제 단서로 → 빈칸의 시제 파악하기",
              "- 과거형 동사 / yesterday / last week → 과거형",
              "- will + 동사원형 / tomorrow / next week → 미래형"
            ],
            "vocab": [
              {
                "en": "• direct A to V: A",
                "ko": "에게 ~하도록 지시하다"
              },
              {
                "en": "• take over:",
                "ko": "맡다, 인수하다"
              },
              {
                "en": "• progress update:",
                "ko": "진행 상황 보고"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 75,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "마무리 멘트",
          "tutor": "이제 다음 문제로 넘어갈게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 76,
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
          "no": 77,
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
          "no": 78,
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
          "no": 79,
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
          "no": 80,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S3 개념 코칭",
          "tutor": "우선 문장에서 동사가 없으므로 빈칸은 동사 자리에요. 주어인 The layout은 직접 무언가를 설계할까요, 누군가에 의해 설계되는 대상일까요?",
          "focusQ": 3,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "choice",
            "prompt": "우선 문장에서 동사가 없으므로 빈칸은 동사 자리에요. 주어인 The layout은 직접 무언가를 설계할까요, 누군가에 의해 설계되는 대상일까요?",
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
          "no": 81,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S3 개념 코칭",
          "tutor": "우선 문장에서 동사가 없으므로 빈칸은 동사 자리에요. Layout 즉, 배치가 직접 무언가를 설계할까요, 아니면 누군가에 의해 설계되는 대상일까요?",
          "focusQ": 3,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "우선 문장에서 동사가 없으므로 빈칸은 동사 자리에요. Layout 즉, 배치가 직접 무언가를 설계할까요, 아니면 누군가에 의해 설계되는 대상일까요?",
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
          "no": 82,
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
          "no": 83,
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
          "no": 84,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S5 정답 근거 연결 - C",
          "tutor": "설계되는 과정이 진행 중이라는 의미를 만드는 C, is being designed가 맞아요.",
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
          "no": 85,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S5 정답 근거 연결 - C",
          "tutor": "이 기준으로 답 다시 골라볼게요.",
          "focusQ": 3,
          "gate": "ifWrong",
          "interaction": {
            "kind": "pickAnswer",
            "qIdx": 3
          }
        },
        {
          "no": 86,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S5 피드백 - C",
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
          "no": 87,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 designs면 layout이 직접 설계한다는 의미가 되죠. A는 제외!",
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
          "no": 88,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 was designing은 능동형이죠. 이걸 넣으면 주어는 어떤 의미가 될까요?",
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
            "prompt": "B의 was designing은 능동형이죠. 이걸 넣으면 주어는 어떤 의미가 될까요?",
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
          "no": 89,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 피드백 - B",
          "tutor": "맞아요. 그러니 적절하지 않죠.",
          "focusQ": 3,
          "optionRef": "B",
          "gate": "ifPicked",
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
          "no": 90,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 오답 제거 - D",
          "tutor": "마지막 D예요. designed만 넣어서 수동태를 완성할 수 있을까요?",
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
          "no": 91,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 피드백 - D",
          "tutor": "맞아요. 수동태라면 앞에 be동사가 필요하죠. D도 제외!",
          "focusQ": 3,
          "optionRef": "D",
          "gate": "ifPicked",
          "tutorIfWrong": "수동태는 be + p.p.형태죠. 언뜻 보면 정답인 것 같지만 be동사가 필요해요. 이 자리에 designed만 쓰면 수동태가 완성되지 않아요.",
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
          "no": 92,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
          "focusQ": 3,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 93,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 designs면 layout이 직접 설계한다는 의미가 되죠. A는 제외!",
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
          "no": 94,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 was designing은 능동형이죠. 이걸 넣으면 주어는 어떤 의미가 될까요?",
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
            "prompt": "B의 was designing은 능동형이죠. 이걸 넣으면 주어는 어떤 의미가 될까요?",
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
          "no": 95,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 피드백 - B",
          "tutor": "맞아요. 그러니 적절하지 않죠.",
          "focusQ": 3,
          "optionRef": "B",
          "gate": "onDemand",
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
          "no": 96,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 오답 제거 - D",
          "tutor": "마지막 D예요. designed만 넣어서 수동태를 완성할 수 있을까요?",
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
          "no": 97,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S6 피드백 - D",
          "tutor": "맞아요. 수동태라면 앞에 be동사가 필요하죠. D도 제외!",
          "focusQ": 3,
          "optionRef": "D",
          "gate": "onDemand",
          "tutorIfWrong": "수동태는 be + p.p.형태죠. 언뜻 보면 정답인 것 같지만 be동사가 필요해요. 이 자리에 designed만 쓰면 수동태가 완성되지 않아요.",
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
          "no": 98,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "S7 표현 정리",
          "tutor": "핵심 짚고 넘어갈게요. 수동태에서 진행 중인 상황을 표현할 때는 be동사와 p.p. 사이에 being을 넣어줘요. 그래서 be + p.p.는 '~된 상태', be + being + p.p.는 '~되고 있는 중'이라는 차이가 있어요. 이 문항에서는 layout, '배치, 구성', input, '의견, 조언'을 익혀두세요.",
          "focusQ": 3,
          "tip": {
            "body": [
              "• 수동태 be + p.p.에  being을 넣으면 진행 중",
              "- be + p.p. → ~된 상태",
              "- be + being + p.p. → ~되고 있는 중"
            ],
            "vocab": [
              {
                "en": "• layout:",
                "ko": "배치, 구성"
              },
              {
                "en": "• input:",
                "ko": "의견, 조언"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 99,
          "itemSeq": 4,
          "occurrence": 4,
          "stage": "마무리 멘트",
          "tutor": "이제 실전 문제로 가서 더 연습해봅시다.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        }
      ],
      review: [
        {
          "no": 100,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 바로 앞을 볼게요. 빈칸 바로 앞에서 미래를 나타내는 표현을 찾아 동그라미 쳐볼까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "mark",
            "prompt": "빈칸 바로 앞을 볼게요. 빈칸 바로 앞에서 미래를 나타내는 표현을 찾아 동그라미 쳐볼까요?",
            "targetWords": [
              "will be"
            ]
          }
        },
        {
          "no": 101,
          "stage": "S3 개념 코칭",
          "tutor": "그렇죠. 이 문장에서 entry fee는 '입장료', 보기의 waive는 '면제하다'라는 뜻의 동사예요. 그럼 entry fee는 누군가를 면제하는 쪽일까요, 면제되는 대상일까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "그렇죠. 이 문장에서 entry fee는 '입장료', 보기의 waive는 '면제하다'라는 뜻의 동사예요. 그럼 entry fee는 누군가를 면제하는 쪽일까요, 면제되는 대상일까요?",
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
          "no": 102,
          "stage": "S5 정답 근거 연결 - C",
          "tutor": "정확해요. 수동태를 완성시키는 (C)의 waived가 들어가면 the entry fee will be waived '입장료가 면제될 것이다'라는 뜻이 되어 문맥에도 잘 맞아요.",
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
          "no": 103,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 waives는 3인칭 단수 현재형이라 will be 뒤에 올 수 없어요.",
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
          "no": 104,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 waiving을 쓰면 능동과 수동 중에 어떤 의미가 되나요?",
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
            "kind": "choice",
            "prompt": "B의 waiving을 쓰면 능동과 수동 중에 어떤 의미가 되나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "능동",
                "correct": true
              },
              {
                "text": "수동"
              }
            ]
          }
        },
        {
          "no": 105,
          "stage": "S6 피드백 - B",
          "tutor": "will be + -ing는 미래진행형으로, 입장료가 무언가를 면제하고 있을 것이라는 능동적인 의미가 되어 적절하지 않아요. waive는 타동사인데 빈칸 뒤에 목적어도 없으니 오답이에요.",
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
          "no": 106,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 waivers의 품사는 무엇일까요?",
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
            "kind": "choice",
            "prompt": "D의 waivers의 품사는 무엇일까요?",
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
          "no": 107,
          "stage": "S6 피드백 - D",
          "tutor": "waivers는 '면제'라는 뜻의 명사가 되어 주격 보어의 역할은 할 수 있지만, '입장료는 면제권들일 것이다.'라는 의미가 되어 이 문장에서는 어색해요.",
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
          "no": 108,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
          "focusQ": 0,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 109,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 waives는 3인칭 단수 현재형이라 will be 뒤에 올 수 없어요.",
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
          "no": 110,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 waiving을 쓰면 능동과 수동 중에 어떤 의미가 되나요?",
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
            "kind": "choice",
            "prompt": "B의 waiving을 쓰면 능동과 수동 중에 어떤 의미가 되나요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "능동",
                "correct": true
              },
              {
                "text": "수동"
              }
            ]
          }
        },
        {
          "no": 111,
          "stage": "S6 피드백 - B",
          "tutor": "will be + -ing는 미래진행형으로, 입장료가 무언가를 면제하고 있을 것이라는 능동적인 의미가 되어 적절하지 않아요. waive는 타동사인데 빈칸 뒤에 목적어도 없으니 오답이에요.",
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
          "no": 112,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 waivers의 품사는 무엇일까요?",
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
            "kind": "choice",
            "prompt": "D의 waivers의 품사는 무엇일까요?",
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
          "no": 113,
          "stage": "S6 피드백 - D",
          "tutor": "waivers는 '면제'라는 뜻의 명사가 되어 주격 보어의 역할은 할 수 있지만, '입장료는 면제권들일 것이다.'라는 의미가 되어 이 문장에서는 어색해요.",
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
          "no": 114,
          "stage": "S7 표현 정리",
          "tutor": "포인트 정리할게요. 이번 문제처럼 조동사 뒤에 be가 보인다면, 주어가 행동을 받는지 확인해 주세요. 수동태라면 조동사 뒤에 바로 be + p.p. 형태가 들어가요. 자주 쓰이는 조동사 수동태는 예문에서처럼 의미가 달라지니 확인하고 넘어갈게요. 핵심 어휘는 entry fee, '입장료', waive, '요금이나 비용을 면제하다'이니 함께 익혀두세요!",
          "focusQ": 0,
          "tip": {
            "body": [
              "• 조동사(can / will / must 등) + be + p.p. → 수동태",
              "예) The fee can be waived. → 면제될 수 있다.",
              "The fee will be waived. → 면제될 것이다.",
              "The fee must be waived. → 면제되어야 한다."
            ],
            "vocab": [
              {
                "en": "• entry fee:",
                "ko": "입장료"
              },
              {
                "en": "• waive: (",
                "ko": "요금·비용 등을) 면제하다"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 115,
          "stage": "S2 유형·역할 판별",
          "tutor": "먼저 빈칸 뒤를 볼게요. as the editor-in-chief는 '편집장으로'라는 뜻이에요. appoint A as B는 'A를 B로 임명하다'라는 표현인데, 문장의 주어인 Romesh Sastry가 어떤 역할을 하고 있는지 생각해 볼까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "먼저 빈칸 뒤를 볼게요. as the editor-in-chief는 '편집장으로'라는 뜻이에요. appoint A as B는 'A를 B로 임명하다'라는 표현인데, 문장의 주어인 Romesh Sastry가 어떤 역할을 하고 있는지 생각해 볼까요?",
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
          "no": 116,
          "stage": "S3 개념 코칭",
          "tutor": "그렇죠. Romesh Sastry가 누군가를 임명하는 게 아니라 편집장으로 임명되는 사람이에요. 따라서 능동과 수동 중 어떤 것이 필요할까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "그렇죠. Romesh Sastry가 누군가를 임명하는 게 아니라 편집장으로 임명되는 사람이에요. 따라서 능동과 수동 중 어떤 것이 필요할까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "능동"
              },
              {
                "text": "수동",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 117,
          "stage": "S4 구조·흐름 파악",
          "tutor": "좋아요. 수동태가 필요하고 이번에는 이 일이 언제 일어났는지 알려주는 표현을 찾아 밑줄 쳐볼까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "mark",
            "prompt": "좋아요. 수동태가 필요하고 이번에는 이 일이 언제 일어났는지 알려주는 표현을 찾아 밑줄 쳐볼까요?",
            "targetWords": [
              "yesterday"
            ]
          }
        },
        {
          "no": 118,
          "stage": "S5 정답 근거 연결 - A",
          "tutor": "잘 찾았어요. yesterday가 있으니까 시제는 과거로 가야 해요. 결국 이 문장에는 과거 + 수동태라는 두 조건이 필요해요. 이를 만족하는 선지는 (A) was appointed에요.",
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
          "no": 119,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 appoints는 3인칭 단수 현재형이라 yesterday와 어울리지 않아요. 또한 Romesh Sastry가 누군가를 임명하는 능동태가 되어 문맥에도 맞지 않아요.",
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
          "no": 120,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 is appointing은 현재진행형 능동태예요. Romesh Sastry가 지금 누군가를 임명하고 있다는 의미가 되어, yesterday와도 어울리지 않고 문맥에도 맞지 않아요",
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
          "no": 121,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 appointed를 넣으면 Romesh Sastry가 편집장으로 임명했다 또는 Romesh Sastry가 편집장으로 임명되었다 중에 어떤 의미가 될까요?",
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
            "kind": "choice",
            "prompt": "D의 appointed를 넣으면 Romesh Sastry가 편집장으로 임명했다 또는 Romesh Sastry가 편집장으로 임명되었다 중에 어떤 의미가 될까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "Romesh Sastry가 편집장으로 임명했다",
                "correct": true
              },
              {
                "text": "Romesh Sastry가 편집장으로 임명되었다"
              }
            ]
          }
        },
        {
          "no": 122,
          "stage": "S6 피드백 - D",
          "tutor": "맞아요. Romesh Sastry가 임명하는 주체가 되기 때문에 문장의 의미와 맞지 않아요.",
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
          "no": 123,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
          "focusQ": 1,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 124,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 appoints는 3인칭 단수 현재형이라 yesterday와 어울리지 않아요. 또한 Romesh Sastry가 누군가를 임명하는 능동태가 되어 문맥에도 맞지 않아요.",
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
          "no": 125,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 is appointing은 현재진행형 능동태예요. Romesh Sastry가 지금 누군가를 임명하고 있다는 의미가 되어, yesterday와도 어울리지 않고 문맥에도 맞지 않아요",
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
          "no": 126,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 appointed를 넣으면 Romesh Sastry가 편집장으로 임명했다 또는 Romesh Sastry가 편집장으로 임명되었다 중에 어떤 의미가 될까요?",
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
            "kind": "choice",
            "prompt": "D의 appointed를 넣으면 Romesh Sastry가 편집장으로 임명했다 또는 Romesh Sastry가 편집장으로 임명되었다 중에 어떤 의미가 될까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "Romesh Sastry가 편집장으로 임명했다",
                "correct": true
              },
              {
                "text": "Romesh Sastry가 편집장으로 임명되었다"
              }
            ]
          }
        },
        {
          "no": 127,
          "stage": "S6 피드백 - D",
          "tutor": "맞아요. Romesh Sastry가 임명하는 주체가 되기 때문에 문장의 의미와 맞지 않아요.",
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
          "no": 128,
          "stage": "S7 표현 정리",
          "tutor": "포인트 정리할게요. appoint A as B, 'A를 B로 임명하다'라는 표현으로 알아두세요. A가 임명되는 대상이면 수동태로 A be appointed as B​를 사용합니다. 예문 한번 읽어보고 넘어갈게요.",
          "focusQ": 1,
          "tip": {
            "body": [
              "• appoint A as B: A를 B로 임명하다 → A be appointed as B: A가 B로 임명되다",
              "예) The manager appointed Tom as team leader. → 관리자는 Tom을 팀장으로 임명했다.",
              "Tom was appointed as team leader. → Tom은 팀장으로 임명되었다."
            ],
            "vocab": []
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 129,
          "stage": "S2 유형·역할 판별",
          "tutor": "먼저 문장 뒤쪽을 볼게요. 누가 조립하는지를 알려주는 표현이 있어요. 그 표현 전체를 찾아서 밑줄 쳐볼까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "mark",
            "prompt": "먼저 문장 뒤쪽을 볼게요. 누가 조립하는지를 알려주는 표현이 있어요. 그 표현 전체를 찾아서 밑줄 쳐볼까요?",
            "targetWords": [
              "by expert carpenters"
            ]
          }
        },
        {
          "no": 130,
          "stage": "S3 개념 코칭",
          "tutor": "잘 찾았어요. '전문 목수들에 의해'라는 뜻의 by expert carpenters는 누가 행동하는지 알려주는 표현이에요. 이렇게 by + 행위자가 나오면 수동태가 필요한지 먼저 확인해 보면 좋아요. 다만 by만 보고 바로 결정하지 말고, 주어가 행동을 받는 대상인지도 함께 확인해야 해요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 131,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그럼 주어 All of Nakano Furniture's products는 직접 무언가를 조립하는 쪽일까요, 목수들에 의해 조립되는 쪽일까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "그럼 주어 All of Nakano Furniture's products는 직접 무언가를 조립하는 쪽일까요, 목수들에 의해 조립되는 쪽일까요?",
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
          "no": 132,
          "stage": "S4 구조·흐름 파악",
          "tutor": "맞아요. 그러면 수동태가 필요하겠네요. 이번에는 주어의 수를 확인할게요. products는 단수인가요, 복수인가요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "맞아요. 그러면 수동태가 필요하겠네요. 이번에는 주어의 수를 확인할게요. products는 단수인가요, 복수인가요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "단수"
              },
              {
                "text": "복수",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 133,
          "stage": "S5 정답 근거 연결 - D",
          "tutor": "그렇죠! 그러면 are + p.p. 형태로 수동태를 완성하는 보기는 (D) are assembled에요.",
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
          "no": 134,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 assemble은 현재형 능동태예요. '제품들이 조립한다'는 의미가 되어 문맥에 맞지 않아요.",
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
          "no": 135,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 assembled는 과거분사이지만, 앞에 be동사가 없어서 수동태를 완성할 수 없어요.",
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
          "no": 136,
          "stage": "S6 오답 제거 - C",
          "tutor": "C를 넣으면 '모든 제품이 하나씩 조립하고 있다'라는 뜻이 돼요. 이 문장에서 실제로 조립하는 쪽은 products일까요, expert carpenters일까요?",
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
            "kind": "choice",
            "prompt": "C를 넣으면 '모든 제품이 하나씩 조립하고 있다'라는 뜻이 돼요. 이 문장에서 실제로 조립하는 쪽은 products일까요, expert carpenters일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "products"
              },
              {
                "text": "expert carpenters",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 137,
          "stage": "S6 피드백 - C",
          "tutor": "맞아요. 조립하는 주체는 expert carpenters이므로, products가 조립한다는 의미의 are assembling은 적절하지 않아요.",
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
          "no": 138,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 139,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 assemble은 현재형 능동태예요. '제품들이 조립한다'는 의미가 되어 문맥에 맞지 않아요.",
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
          "no": 140,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 assembled는 과거분사이지만, 앞에 be동사가 없어서 수동태를 완성할 수 없어요.",
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
          "no": 141,
          "stage": "S6 오답 제거 - C",
          "tutor": "C를 넣으면 '모든 제품이 하나씩 조립하고 있다'라는 뜻이 돼요. 이 문장에서 실제로 조립하는 쪽은 products일까요, expert carpenters일까요?",
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
            "kind": "choice",
            "prompt": "C를 넣으면 '모든 제품이 하나씩 조립하고 있다'라는 뜻이 돼요. 이 문장에서 실제로 조립하는 쪽은 products일까요, expert carpenters일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "products"
              },
              {
                "text": "expert carpenters",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 142,
          "stage": "S6 피드백 - C",
          "tutor": "맞아요. 조립하는 주체는 expert carpenters이므로, products가 조립한다는 의미의 are assembling은 적절하지 않아요.",
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
          "no": 143,
          "stage": "S7 표현 정리",
          "tutor": "포인트 정리할게요. 수동태 문제에서는 주어의 수에 맞춰 be동사의 형태를 고르는 것이 중요해요. 특히 of + 명사가 포함된 주어는 핵심 주어가 무엇인지 정확히 확인하세요. 화면의 예문 한번 읽어보고 어휘까지 익혀두고 넘어갈게요.",
          "focusQ": 2,
          "tip": {
            "body": [
              "• 수동태 문제에서 주어의 수 확인하기",
              "- 단수 주어 → is/was + p.p.",
              "- 복수 주어 → are/were + p.p.",
              "•  주어가 of + 명사를 포함하면 → 핵심 주어의 수 확인하기",
              "- The box of tools is delivered.",
              "- The boxes of equipment are delivered."
            ],
            "vocab": [
              {
                "en": "• assemble:",
                "ko": "조립하다"
              },
              {
                "en": "• carpenter:",
                "ko": "목수"
              },
              {
                "en": "• piece by piece:",
                "ko": "하나씩, 한 부분씩"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 144,
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
          "no": 145,
          "stage": "S3 개념 코칭",
          "tutor": "잘 찾았어요. 빈칸 바로 뒤에 Mr. Stepp's duties라는 목적어가 이어지고 있죠. assume은 '추정하다'라는 뜻도 있지만, assume duties라고 하면 '업무를 맡다'라는 뜻이에요. 이렇게 동사 뒤에 목적어가 바로 이어지면, 주어가 직접 행동하는 능동태인지 먼저 확인해 보면 좋아요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 146,
          "stage": "S4 구조·흐름 파악",
          "tutor": "Ms. Chin은 업무를 맡는 사람, 맡겨지는 사람 중 어느 쪽일까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "Ms. Chin은 업무를 맡는 사람, 맡겨지는 사람 중 어느 쪽일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "맡는 사람",
                "correct": true
              },
              {
                "text": "맡겨지는 사람"
              }
            ]
          }
        },
        {
          "no": 147,
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
          "no": 148,
          "stage": "S5 정답 근거 연결 - D",
          "tutor": "좋아요. while 같은 시간절에서는 앞으로의 일을 말하더라도 is처럼 현재형을 쓸 수 있어요. while he is ..가 있다고 해서 주절까지 현재형이어야 하는 건 아니고, 이 문장의 주절에서는 Ms. Chin이 그 기간 동안 업무를 맡게 될 것이므로 미래형인 will assume이 자연스러워요.",
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
          "no": 149,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 assumed는 '맡았다'라는 뜻이에요. 그런데 Mr. Stepp이 세미나에 있는 동안 Ms. Chin이 업무를 맡는 일은 이미 일어난 일일까요, 앞으로 일어날 일일까요?",
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
            "kind": "choice",
            "prompt": "A의 assumed는 '맡았다'라는 뜻이에요. 그런데 Mr. Stepp이 세미나에 있는 동안 Ms. Chin이 업무를 맡는 일은 이미 일어난 일일까요, 앞으로 일어날 일일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "이미 일어난 일"
              },
              {
                "text": "앞으로 일어날 일",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 150,
          "stage": "S6 피드백 - A",
          "tutor": "맞아요. 앞으로 일어날 일이므로 과거형인 assumed는 적절하지 않아요.",
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
          "no": 151,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 to assume은 to부정사예요. 이 자리에는 주어인 Ms. Chin의 동사가 필요하므로 to assume은 올 수 없어요.",
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
          "no": 152,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 is assumed는 현재 수동태예요. 'Ms. Chin이 업무를 맡겨진다'라는 의미가 되어 문맥에 맞지 않아요.",
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
          "no": 153,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
          "focusQ": 3,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 154,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 assumed는 '맡았다'라는 뜻이에요. 그런데 Mr. Stepp이 세미나에 있는 동안 Ms. Chin이 업무를 맡는 일은 이미 일어난 일일까요, 앞으로 일어날 일일까요?",
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
            "kind": "choice",
            "prompt": "A의 assumed는 '맡았다'라는 뜻이에요. 그런데 Mr. Stepp이 세미나에 있는 동안 Ms. Chin이 업무를 맡는 일은 이미 일어난 일일까요, 앞으로 일어날 일일까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "이미 일어난 일"
              },
              {
                "text": "앞으로 일어날 일",
                "correct": true
              }
            ]
          }
        },
        {
          "no": 155,
          "stage": "S6 피드백 - A",
          "tutor": "맞아요. 앞으로 일어날 일이므로 과거형인 assumed는 적절하지 않아요.",
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
          "no": 156,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 to assume은 to부정사예요. 이 자리에는 주어인 Ms. Chin의 동사가 필요하므로 to assume은 올 수 없어요.",
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
          "no": 157,
          "stage": "S6 오답 제거 - C",
          "tutor": "C의 is assumed는 현재 수동태예요. 'Ms. Chin이 업무를 맡겨진다'라는 의미가 되어 문맥에 맞지 않아요.",
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
          "no": 158,
          "stage": "S7 표현 정리",
          "tutor": "핵심 포인트 정리할게요. assume은 업무나 책임을 맡는다는 의미로 자주 사용돼요. 그리고 when, while, after, before처럼 시간을 나타내는 절에서는 미래의 일도 현재형으로 표현할 수 있다는 점 알아두세요. 예문 꼼꼼하게 읽어보고 충분히 이해하고 넘어갈게요.",
          "focusQ": 3,
          "tip": {
            "body": [
              "• assume + 업무/책임",
              "- assume duties: 업무를 맡다",
              "- assume responsibility: 책임을 맡다",
              "• 시간을 나타내는 절에서는 미래의 일도 현재형으로 표현",
              "→ when / while / after / before + 현재형",
              "→ 주절: will + 동사원형 사용 가능",
              "예) When the meeting ends, we will leave. (회의가 끝나면 우리는 떠날 것이다.)",
              "We will go home after the store closes. (가게가 문을 닫으면 우리는 집에 갈 것이다.)"
            ],
            "vocab": []
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 159,
          "stage": "S2 유형·역할 판별",
          "tutor": "먼저 that을 볼게요. that이 어떤 명사를 설명하고 있는지 찾아 동그라미 쳐볼까요?",
          "focusQ": 4,
          "interaction": {
            "kind": "mark",
            "prompt": "먼저 that을 볼게요. that이 어떤 명사를 설명하고 있는지 찾아 동그라미 쳐볼까요?",
            "targetWords": [
              "building"
            ]
          }
        },
        {
          "no": 160,
          "stage": "S3 개념 코칭",
          "tutor": "맞아요. that은 앞의 the building을 이어서 설명하고 있어요. 그럼 이제 이 건물이 직접 무언가를 하는지, 아니면 어떤 행동을 받는지 확인해 볼게요.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 161,
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
          "no": 162,
          "stage": "S5 정답 근거 연결 - C",
          "tutor": "맞아요. 건물이 스스로 다른 것을 건설하는 게 아니라 누군가가 건물을 건설하는 것이죠. 따라서 that 뒤에는 능동태가 아니라 수동태가 필요해요. 빈칸 뒤에 목적어도 없으니 be + p.p. 형태인 was constructed가 들어가야 해요.",
          "focusQ": 4,
          "reveal": {
            "optionText": [
              {
                "qIdx": 4,
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
          "no": 163,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 is constructing은 '건설하고 있다'라는 능동 진행형이라 건물이 직접 무언가를 건설하는 뜻이 되어 적절하지 않아요.",
          "focusQ": 4,
          "optionRef": "A",
          "gate": "ifPicked",
          "reveal": {
            "optionText": [
              {
                "qIdx": 4,
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
          "no": 164,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 constructed는 과거형 능동태예요. 건물이 무언가를 지었다는 의미가 되어 적절하지 않아요.",
          "focusQ": 4,
          "optionRef": "B",
          "gate": "ifPicked",
          "reveal": {
            "optionText": [
              {
                "qIdx": 4,
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
          "no": 165,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 has constructed도 현재완료 능동태예요. 건물이 무언가를 건설해왔다는 의미가 되므로 적절하지 않아요.",
          "focusQ": 4,
          "optionRef": "D",
          "gate": "ifPicked",
          "reveal": {
            "optionText": [
              {
                "qIdx": 4,
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
          "no": 166,
          "stage": "오답 해설 질문",
          "tutor": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
          "focusQ": 4,
          "interaction": {
            "kind": "askOption",
            "prompt": "오답 선택지 중 헷갈렸던 선택지가 있나요?",
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
                "text": "없음"
              }
            ]
          }
        },
        {
          "no": 167,
          "stage": "S6 오답 제거 - A",
          "tutor": "A의 is constructing은 '건설하고 있다'라는 능동 진행형이라 건물이 직접 무언가를 건설하는 뜻이 되어 적절하지 않아요.",
          "focusQ": 4,
          "optionRef": "A",
          "gate": "onDemand",
          "reveal": {
            "optionText": [
              {
                "qIdx": 4,
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
          "no": 168,
          "stage": "S6 오답 제거 - B",
          "tutor": "B의 constructed는 과거형 능동태예요. 건물이 무언가를 지었다는 의미가 되어 적절하지 않아요.",
          "focusQ": 4,
          "optionRef": "B",
          "gate": "onDemand",
          "reveal": {
            "optionText": [
              {
                "qIdx": 4,
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
          "no": 169,
          "stage": "S6 오답 제거 - D",
          "tutor": "D의 has constructed도 현재완료 능동태예요. 건물이 무언가를 건설해왔다는 의미가 되므로 적절하지 않아요.",
          "focusQ": 4,
          "optionRef": "D",
          "gate": "onDemand",
          "reveal": {
            "optionText": [
              {
                "qIdx": 4,
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
          "no": 170,
          "stage": "S7 표현 정리",
          "tutor": "핵심 포인트 정리할게요. 관계대명사 that 뒤에 빈칸이 나오면, that이 가리키는 명사를 넣어서 문장을 만들어보세요. 그 명사가 직접 행동하면 능동태, 행동을 받으면 수동태가 됩니다. 화면의 예문처럼 바꿔보면서 확인하면 쉽게 구분할 수 있어요.",
          "focusQ": 4,
          "tip": {
            "body": [
              "• that 뒤 빈칸 → that이 가리키는 명사를 넣어 문장 만들어보기",
              "- 명사가 직접 행동하면 → 능동태",
              "- 명사가 행동을 받으면 → 수동태",
              "The house that Jack built is beautiful.",
              "→ Jack built the house [능동]",
              "The house that was built last year is beautiful.",
              "→ The house was built [수동]"
            ],
            "vocab": [
              {
                "en": "• differ:",
                "ko": "다르다"
              },
              {
                "en": "• construct:",
                "ko": "건설하다"
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
      conceptTip: {
        "body": [
          "사물이 나오는 사진에서 동작과 상태를 혼동하지 않도록 주의해야 한다.",
          "• 사물이 이미 놓여 있는 상태이면 선택지에 ( ① ______ )나 ( ② ______ )가 나온다.",
          "• 사물이 누군가에 의해 놓이거나 옮겨지고 있는 중이면 선택지에 ( ③ ______ )가 나온다."
        ],
        "vocab": []
      },
      summary: [
        {
          "title": "Part 1 사람·사물 사진 핵심 정리",
          "intro": "오늘 배운 내용을 빠르게 정리해볼게요. 빈칸에 들어갈 알맞은 말을 직접 말하거나 글로 입력해서 배운 내용을 확인해보세요!",
          "items": [
            {
              "id": "s1_1",
              "head": "인물 사진 오답 판별",
              "en": "인물 사진에서는 인물의 행동을 묘사하는 핵심 동사를 반드시 듣고, 사진에 ___ 사물이나 장소가 나오면 오답으로 제거한다.",
              "ko": "맞아요. 인물 사진에서는 사람이 실제로 무엇을 하고 있는지 나타내는 동사를 먼저 잡고, 사진에 없는 사물이나 장소가 나오면 오답으로 X 하라고 했어요.",
              "answer": "없는",
              "choices": [],
              "keywords": [
                "없는"
              ]
            },
            {
              "id": "s1_2",
              "head": "사물의 동작·상태 구별",
              "en": "사물 사진에서 사물이 이미 놓여 있는 상태라면 be p.p.나 ___가 자주 나오고, 사물에 어떤 동작이 진행 중이라면 be being p.p. 형태가 나온다.",
              "ko": "맞아요. have been lined up처럼 'have/has been p.p.'는 사물이 이미 어떤 상태로 놓여 있을 때 자주 나오고, are being installed처럼 'be being p.p.'는 누군가에 의해 사물이 놓이는 중일 때 써요.",
              "answer": "have(has) been p.p.",
              "choices": [],
              "keywords": [
                "have(has) been p.p."
              ]
            },
            {
              "id": "s1_3",
              "head": "be being p.p. 예외 표현",
              "en": "사진에 사람이 보이지 않고, 동작이 진행 중이지 않더라도 be being p.p.가 정답이 될 수 있는 표현이 있다.\nbe being ___: 진열되고 있다\nbe being cast: 그림자가 드리워지고 있다\nbe being exhibited: 전시되고 있다\nbe being stored : 보관되고 있다",
              "ko": "그렇죠. 사진에서 사람이 보이지 않고 상품이 진열된 상태더라도 be being displayed가 정답이 될 수 있어요. be being cast, be being exhibited, be being stored 같은 예외 표현은 묶어서 꼭 기억해두세요!.",
              "answer": "displayed",
              "choices": [],
              "keywords": [
                "displayed"
              ]
            },
            {
              "id": "s1_4",
              "head": "be + -ing 상태 표현",
              "en": "be + -ing라고 해서 항상 동작 중인 것은 아니다. 이미 옷을 착용하고 있는 상태는 ___, 들고 있는 상태는 be holding, 타고 있는 상태는 be riding으로 표현할 수 있다.",
              "ko": "맞아요. wearing, holding, riding, hanging처럼 -ing지만 상태를 나타내는 표현은 따로 기억해두세요.",
              "answer": "be wearing",
              "choices": [],
              "keywords": [
                "be wearing"
              ]
            }
          ]
        },
        {
          "title": "핵심 빈출 표현 정리",
          "intro": "마지막으로 오늘 문제에서 나온 토익 빈출 표현을 확인해볼게요. 영어 표현을 보고 알맞은 뜻을 골라보세요.",
          "items": [
            {
              "id": "s2_1",
              "en": "line up = ___",
              "ko": "잘했어요! 오늘 나온 어휘까지 다 확인했어요. Part 1은 단어를 듣자마자 뜻이 바로 떠올라야 빠르게 풀 수 있어요. 특히 방금 틀린 어휘는 그냥 넘어가지 말고, 뜻이 바로 나올 때까지 달달 외워두세요. 어휘가 잡혀야 선택지도 훨씬 빨리 들립니다.",
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
          "stage": "S3 개념 코칭 (1)",
          "tutor": "Part 1에서 나오는 사진 유형은 두 가지예요. 인물이 등장하는 사진, 반대로 사물과 풍경만 나오는 사진이 있어요. 그래서 인물이 어떤 행동을 하는 중인지, 사물이 어떤 위치로 놓여있는지 선택지를 잘 듣고 빠르게 사진과 비교할 수 있어야 해요. 그럼 표현만 빠르게 같이 보고 문제 풀어보도록 할게요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          },
          "board": true
        },
        {
          "no": 2,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (2)",
          "tutor": "인물이 '지금 ~하고 있다'는 동작을 나타낼 때는 be + -ing로 표현해요. 그러면 사물이 이미 놓여 있는 상태일 때는 어떤 표현을 쓸까요?",
          "focusQ": 0,
          "tipAt": [
            {
              "n": 1,
              "text": "be p.p."
            }
          ],
          "interaction": {
            "kind": "choice",
            "prompt": "인물이 '지금 ~하고 있다'는 동작을 나타낼 때는 be + -ing로 표현해요. 그러면 사물이 이미 놓여 있는 상태일 때는 어떤 표현을 쓸까요?",
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
          },
          "board": true
        },
        {
          "no": 3,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (3)",
          "tutor": "사진에서 사물이 이미 놓여 있는 상태일 때는 be p.p 로 표현해요. 그러면 반대로 사물에 어떤 동작이 진행되고 있을 때는 어떤 표현을 쓸까요?",
          "focusQ": 0,
          "tipAt": [
            {
              "n": 3,
              "text": "be being p.p."
            }
          ],
          "interaction": {
            "kind": "choice",
            "prompt": "사진에서 사물이 이미 놓여 있는 상태일 때는 be p.p 로 표현해요. 그러면 반대로 사물에 어떤 동작이 진행되고 있을 때는 어떤 표현을 쓸까요?",
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
          },
          "board": true
        },
        {
          "no": 4,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (4)",
          "tutor": "be being p.p.는 사물에 어떤 동작이 지금 진행되고 있다는 뜻이에요. 그래서 이 표현이 나오면 사진에서도 누군가가 사물을 놓거나 옮기는 장면이 보여야 해요. 그럼 has/have been p.p.는 동작이 진행 중인 걸까요, 이미 이루어진 상태를 나타내는 걸까요?",
          "focusQ": 0,
          "tipAt": [
            {
              "n": 2,
              "text": "has/have been p.p."
            }
          ],
          "interaction": {
            "kind": "choice",
            "prompt": "be being p.p.는 사물에 어떤 동작이 지금 진행되고 있다는 뜻이에요. 그래서 이 표현이 나오면 사진에서도 누군가가 사물을 놓거나 옮기는 장면이 보여야 해요. 그럼 has/have been p.p.는 동작이 진행 중인 걸까요, 이미 이루어진 상태를 나타내는 걸까요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "진행 중인 동작"
              },
              {
                "text": "이미 이루어진 상태",
                "correct": true
              }
            ]
          },
          "board": true
        },
        {
          "no": 5,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (5)",
          "tutor": "has/have been p.p.도 사물에 어떤 동작이 이미 이루어진 상태를 나타낼 수 있어요. 그래서 사물 사진에서는 be p.p. / has·have been p.p.처럼 상태를 나타내는 표현과 be being p.p.처럼 진행 중인 동작을 나타내는 표현을 구별해서 들어야 해요. 특히 사진에서 사람 없이 사물이나 풍경만 보이는데 be being p.p.가 나오면, 그 선택지는 오답일 확률이 높아요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          },
          "board": true,
          "tip": {
            "body": [
              "사물이 나오는 사진에서 동작과 상태를 혼동하지 않도록 주의해야 한다.",
              "• 사물이 이미 놓여 있는 상태이면 선택지에 be p.p.나 has/have been p.p.가 나온다.",
              "• 사물이 누군가에 의해 놓이거나 옮겨지고 있는 중이면 선택지에 be being p.p.가 나온다."
            ],
            "vocab": []
          }
        },
        {
          "no": 6,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "자, 그러면 지금 이 사진에서는 여자가 그림을 그리는 중이에요. 그러면 선택지에는 여자의 동작을 묘사하는 표현이 나오겠죠? 문제 풀어볼게요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 7,
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
          "no": 8,
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
          "no": 9,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "음원 재생",
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
          "no": 10,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "인물이 '지금 ~하고 있다'는 동작을 나타낼 때는 be + -ing로 표현한다고 했죠? 여기서 여자의 핵심 동작을 나타내는 표현은 무엇인가요?",
          "focusQ": 0,
          "interaction": {
            "kind": "subjective",
            "prompt": "여기서 여자의 핵심 동작을 나타내는 표현은 무엇인가요?",
            "hint": "is painting (a picture)"
          }
        },
        {
          "no": 11,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S5 정답 근거 연결",
          "tutor": "핵심 동작을 나타내는 표현은 is painting a picture이었어요. 그 뒤에 나오는 easel은 그림판을 놓는 틀이에요. 인물의 동작과 위치를 나타내는 표현 모두 사진과 일치하므로 정답이에요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 12,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A에서 rinsing, in a sink라고 했어요. rinse는 무슨 뜻일까요?",
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
            "prompt": "선택지 A에서 rinsing, in a sink라고 했어요. rinse는 무슨 뜻일까요?",
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
          "no": 13,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (A)",
          "tutor": "rinse는 '헹구다'라는 뜻이에요. rinsing 뜻을 모른다해도 사진에 싱크대는 안나오죠? 동사 뜻을 잘 모르거나 정확히 못들었어도, 뒤에 들린 사물이나 장소가 사진에 없으면 오답으로 지우고 넘기면 돼요.",
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
          "no": 14,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서는 is visiting, art gallery 라고 했어요. 여자가 미술 박물관을 방문하고 있지 않으니까 인물의 동작, 장소 모두 일치하지 않아서 오답이에요.",
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
          "no": 15,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D에서는 is holding, a tube of paint 라고 했죠. 물감 튜브는 책상에 있고 여자는 팔레트 같은 거를 들고 있죠? 따라서 D는 오답이에요.",
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
          "no": 16,
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
          "no": 17,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A에서 rinsing, in a sink라고 했어요. rinse는 무슨 뜻일까요?",
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
            "prompt": "선택지 A에서 rinsing, in a sink라고 했어요. rinse는 무슨 뜻일까요?",
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
          "no": 18,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (A)",
          "tutor": "rinse는 '헹구다'라는 뜻이에요. rinsing 뜻을 모른다해도 사진에 싱크대는 안나오죠? 동사 뜻을 잘 모르거나 정확히 못들었어도, 뒤에 들린 사물이나 장소가 사진에 없으면 오답으로 지우고 넘기면 돼요.",
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
          "no": 19,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서는 is visiting, art gallery 라고 했어요. 여자가 미술 박물관을 방문하고 있지 않으니까 인물의 동작, 장소 모두 일치하지 않아서 오답이에요.",
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
          "no": 20,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D에서는 is holding, a tube of paint 라고 했죠. 물감 튜브는 책상에 있고 여자는 팔레트 같은 거를 들고 있죠? 따라서 D는 오답이에요.",
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
          "no": 21,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S7 표현 정리",
          "tutor": "이제 핵심 정리해볼게요. 인물이 등장하는 선택지를 들으면 인물의 행동을 묘사하는 핵심 동사를 듣고, 뒤에 나오는 사물이나 장소가 맞는지 확인하면 돼요. 특히 사진에 없는 사물이나 장소가 하나라도 들리면 바로 오답으로 제거하세요. 조금 어려웠던 어휘는 rinse '헹구다'였어요.",
          "focusQ": 0,
          "tip": {
            "body": [
              "• 인물의 행동을 묘사하는 동사를 반드시 듣는다.",
              "• 사진에 없는 사물이나 장소가 하나라도 들리면 바로 오답으로 제거한다."
            ],
            "vocab": [
              {
                "en": "rinse",
                "ko": "헹구다"
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
          "stage": "마무리 멘트",
          "tutor": "이제 다음 문제로 넘어갈게요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 23,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번에는 인물 없이 사물, 풍경만 나오는 사진에서는 사물의 위치와 상태를 잘 확인해야 해요. 행거에 옷이 걸려있고, 바닥과 왼쪽 선반에 신발이 있고, 우측 벽에는 모자가 걸려있죠? 이제 문제 풀어보세요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 24,
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
          "no": 25,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "채점",
          "tutor": "정답이에요. 잘 맞혔어요! 정답 같이 확인해볼게요.",
          "focusQ": 1,
          "tutorIfWrong": "정답은 A였어요. 어떤 부분에서 헷갈렸는지 같이 확인해볼게요.",
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
          "no": 27,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "are lined up, on the floor라고 했어요. line up은 무슨 뜻일까요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "are lined up, on the floor라고 했어요. line up은 무슨 뜻일까요?",
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
          "no": 28,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S5 정답 근거 연결",
          "tutor": "are lined up은 '줄지어 놓여 있다'라는 뜻이에요. 사진에서 신발 두 켤레가 옷장 아래 바닥에 줄지어 세워져 있죠? 또 누군가 신발을 줄 세우는 중이 아니라, 신발이 이미 줄지어 있는 상태이기 때문에 be p.p. 형태인 are lined up도 일치해서 정답이에요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 29,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B는 folded and stacked라고 했어요. 옷이 개여서 쌓여 있다는 의미예요. 사진과 일치하지 않으므로 오답이에요.",
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
          "no": 30,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C는 핸드백이, on top of a basket, 바구니 위에 있다고 했어요. 핸드백은 행거에 걸려있으니까 위치 표현이 맞지 않아요.",
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
          "no": 31,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D의 are being stored는 '보관되고 있다'는 뜻이에요. be being p.p.는 동작이 진행 중일 때 쓴다고 한다고 했죠? 그런데 예외적으로 이 표현은 동작이 진행되지 않더라도, 보관된 상태여도 쓸 수 있어요. 다만 선택지에서 on some shelves '선반 위에' 라고 했어요. 모자가 선반 위가 아니라 벽에 걸려있죠? 위치가 사진과 맞지 않으니까 오답이에요.",
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
          "no": 32,
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
          "no": 33,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B는 folded and stacked라고 했어요. 옷이 개여서 쌓여 있다는 의미예요. 사진과 일치하지 않으므로 오답이에요.",
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
          "no": 34,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C는 핸드백이, on top of a basket, 바구니 위에 있다고 했어요. 핸드백은 행거에 걸려있으니까 위치 표현이 맞지 않아요.",
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
          "no": 35,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D의 are being stored는 '보관되고 있다'는 뜻이에요. be being p.p.는 동작이 진행 중일 때 쓴다고 한다고 했죠? 그런데 예외적으로 이 표현은 동작이 진행되지 않더라도, 보관된 상태여도 쓸 수 있어요. 다만 선택지에서 on some shelves '선반 위에' 라고 했어요. 모자가 선반 위가 아니라 벽에 걸려있죠? 위치가 사진과 맞지 않으니까 오답이에요.",
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
          "no": 36,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S7 표현 정리",
          "tutor": "이제 핵심 정리해볼게요. be being p.p.가 나오면 사람이 사물을 놓거나 옮기는 중인지 확인하면 돼요. 그런데 선택지 D의 be being stored처럼 예외적으로 사람에 의해 동작이 진행 중이지 않더라도, be being p.p.를 쓸 수 있는 표현들이 있어요. be being displayed '진열되고 있다' 는 사진에서 상품이 이미 진열되어있는 상태여도 쓸 수 있어요. 비슷하게 be being exhibited '전시되고 있다', be being cast '그림자가 드리워지고 있다', be being stored '보관되고 있다' 모두 사물에 동작이 이미 완료된 상태여도 쓸 수 있으니까, 꼭 외워두세요!",
          "focusQ": 1,
          "tip": {
            "body": [
              "be being p.p.가 나오면 사람이 나오는지 확인한다.",
              "<사람이 나오지 않아도 be being p.p.가 정답이 될 수 있는 표현>",
              "• be being displayed: 진열되고 있다",
              "• be being exhibited: 전시되고 있다",
              "• be being cast: 그림자가 드리워지고 있다",
              "• be being stored: 보관되고 있다"
            ],
            "vocab": [
              {
                "en": "be lined up",
                "ko": "줄지어 놓여 있다"
              },
              {
                "en": "stack",
                "ko": "쌓다"
              }
            ]
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
          "no": 37,
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
          "no": 38,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S1 핵심 단서 찾기",
          "tutor": "이번에는 조금 어려운 문제 가볼게요. 선반 위에 화분 여러 개가 있고 바닥에는 식물이 있죠? 사진 속 사물과 위치를 확인했으니 이제 선택지를 듣고 정답을 골라볼게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 39,
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
          "no": 40,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "채점",
          "tutor": "정답이에요. 잘 맞혔어요! 정답 같이 확인해볼게요.",
          "focusQ": 2,
          "tutorIfWrong": "정답은 D였어요. 어떤 부분에서 헷갈렸는지 같이 확인해볼게요.",
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
          "no": 42,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "have been lined up이라고 했죠? have been p.p.가 나왔으니까 화분이 선반 위에 이미 줄지어 놓여 있는 상태여야 해요. 사진과 일치하나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "have been p.p.가 나왔으니까 화분이 선반 위에 이미 줄지어 놓여 있는 상태여야 해요. 사진과 일치하나요?",
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
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S5 정답 근거 연결",
          "tutor": "화분이 선반 위에 이미 줄지어 놓여 있는 상태니까 선택지와 일치해요. line up은 앞 문제에서도 나왔죠? 사물 사진에서 자주 나오는 표현이니깐 잘 알아두세요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 44,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A 에서 are being watered는 '물이 주어지고 있다'는 의미인데 사진에 그런 장면이 나오지 않죠? 따라서 오답으로 지우고 넘기면 돼요. 참고로 be being watered는 사람이 꼭 등장하지 않아도 그 동작이 진행 중이라면 맞을 수 있어요. 예를 들어 스프링클러에서 물이 뿌려지고 있으면 맞는 선택지일 수 있어요.",
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
          "no": 45,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 shovel은 '삽', shed는 '창고' 라는 뜻이에요. prop against는 무슨 뜻일까요?",
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
            "prompt": "선택지 B에서 shovel은 '삽', shed는 '창고' 라는 뜻이에요. prop against는 무슨 뜻일까요?",
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
          "no": 46,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "prop A against B는 'A를 B에 기대어 세워 두다'라는 뜻이에요. prop 뜻 모르더라도 사진에 삽은 나오지 않죠? 이렇게 사진에 없는 사물이 나오면 오답으로 지우면 돼요.",
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
          "no": 47,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서 scattered는 '흩어져 있는'이라는 뜻이에요. 사진에서 큰 나뭇잎들이 바닥 여기저기에 흩어져 있지 않으니까 오답이에요.",
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
          "no": 48,
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
          "no": 49,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A 에서 are being watered는 '물이 주어지고 있다'는 의미인데 사진에 그런 장면이 나오지 않죠? 따라서 오답으로 지우고 넘기면 돼요. 참고로 be being watered는 사람이 꼭 등장하지 않아도 그 동작이 진행 중이라면 맞을 수 있어요. 예를 들어 스프링클러에서 물이 뿌려지고 있으면 맞는 선택지일 수 있어요.",
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
          "no": 50,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 shovel은 '삽', shed는 '창고' 라는 뜻이에요. prop against는 무슨 뜻일까요?",
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
            "prompt": "선택지 B에서 shovel은 '삽', shed는 '창고' 라는 뜻이에요. prop against는 무슨 뜻일까요?",
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
          "no": 51,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (B)",
          "tutor": "prop A against B는 'A를 B에 기대어 세워 두다'라는 뜻이에요. prop 뜻 모르더라도 사진에 삽은 나오지 않죠? 이렇게 사진에 없는 사물이 나오면 오답으로 지우면 돼요.",
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
          "no": 52,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서 scattered는 '흩어져 있는'이라는 뜻이에요. 사진에서 큰 나뭇잎들이 바닥 여기저기에 흩어져 있지 않으니까 오답이에요.",
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
          "no": 53,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "S7 표현 정리",
          "tutor": "핵심 정리할게요. have been p.p.와 be being p.p.가 선택지로 들릴 때 발음을 구별하기 어려울 때가 있어요. been인지 being인지 잘 들어야해요. 빈출되는 어휘는 line up '줄지어 놓다', prop A against B 'A를 B에 기대어 세워 두다', scatter '흩어 놓다'였어요. 꼭 외우고 넘어가세요!",
          "focusQ": 2,
          "tip": {
            "body": [
              "have been p.p.와 be being p.p.는 음원에서 발음이 헷갈리는 경우가 많으므로 주의해서 듣는다."
            ],
            "vocab": [
              {
                "en": "line up",
                "ko": "줄지어 놓다"
              },
              {
                "en": "prop A against B  A",
                "ko": "를 B에 기대어 세워 두다"
              },
              {
                "en": "scatter",
                "ko": "흩어 놓다"
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
          "stage": "마무리 멘트",
          "tutor": "좋아요. 이제 실전 문제로 넘어가 볼게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 102,
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
          "no": 55,
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
          "no": 56,
          "stage": "S5 정답 근거 연결",
          "tutor": "인물의 핵심 동작은 is picking up이었어요. pick up은 무슨 뜻일까요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "인물의 핵심 동작은 is picking up이었어요. pick up은 무슨 뜻일까요?",
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
          "no": 57,
          "stage": "S5 정답 근거 연결",
          "tutor": "is picking up은 '집어 들고 있다'라는 뜻이에요. 사진에서 남자가 커피 머신 위에 있는 an empty cup, '빈 컵'을 집어 들고 있죠. 핵심 동작과 사물이 사진과 모두 일치하므로 정답이에요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 58,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A의 tie는 '매다, 묶다', apron은 '앞치마'라는 뜻이에요. 남자가 앞치마를 하고 있긴 하지만, 지금 앞치마를 묶는 동작을 하고 있는 건 아니죠. 사진에 앞치마가 있다고 해서 apron만 듣고 고르면 안 되고, tying이라는 동작까지 맞는지 봐야 해요.",
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
          "no": 59,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 pouring beans into a coffee machine은 커피 머신에 원두를 붓고 있다는 뜻이에요. 사진에는 이런 동작이 없으니까 바로 X 하면 돼요.",
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
          "no": 60,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서는 남자가 손님에게 음료를 건네고 있다고 했어요. 그런데 사진에 customer, 손님이 나오지 않죠. 이렇게 사진에 없는 사람이나 사물이 나오면 빠르게 오답으로 지울 수 있어요.",
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
          "no": 61,
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
          "no": 62,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A의 tie는 '매다, 묶다', apron은 '앞치마'라는 뜻이에요. 남자가 앞치마를 하고 있긴 하지만, 지금 앞치마를 묶는 동작을 하고 있는 건 아니죠. 사진에 앞치마가 있다고 해서 apron만 듣고 고르면 안 되고, tying이라는 동작까지 맞는지 봐야 해요.",
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
          "no": 63,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 pouring beans into a coffee machine은 커피 머신에 원두를 붓고 있다는 뜻이에요. 사진에는 이런 동작이 없으니까 바로 X 하면 돼요.",
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
          "no": 64,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서는 남자가 손님에게 음료를 건네고 있다고 했어요. 그런데 사진에 customer, 손님이 나오지 않죠. 이렇게 사진에 없는 사람이나 사물이 나오면 빠르게 오답으로 지울 수 있어요.",
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
          "no": 65,
          "stage": "S7 표현 정리",
          "tutor": "핵심 정리할게요. tie, pick up, pour, hand처럼 움직임을 나타내는 동사는 그 순간의 동작이 사진에 실제로 보이는지 확인해야 해요. 빈출 어휘는 tie 매다, 묶다 pick up 집어 들다, pour 붓다, hand 건네주다 예요.",
          "focusQ": 0,
          "tip": {
            "body": [
              "tie, pick up, pour, hand처럼 움직임을 나타내는 동사는 그 순간의 동작이 사진에 실제로 보이는지 확인한다."
            ],
            "vocab": [
              {
                "en": "tie",
                "ko": "매다, 묶다"
              },
              {
                "en": "pick up",
                "ko": "집어 들다"
              },
              {
                "en": "pour",
                "ko": "붓다"
              },
              {
                "en": "hand",
                "ko": "건네주다"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 66,
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
          "no": 67,
          "stage": "S5 정답 근거 연결",
          "tutor": "is hanging이라는 표현이 나왔죠? hang은 '걸다'라는 뜻도 있지만, 그림이나 물건이 이미 걸려 있는 상태를 말할 때 is hanging처럼 진행 형태로 표현할 수도 있어요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 68,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 reading materials는 '읽을거리'라는 뜻이에요. 읽을거리는 사진에 있지만, 소파 위가 아니라 탁자 위에 있죠? 선택지에 사물은 맞아도 위치가 다르면 오답이에요.",
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
          "no": 69,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서 are being installed가 나왔어요. install은 무슨 뜻일까요?",
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
            "prompt": "선택지 C에서 are being installed가 나왔어요. install은 무슨 뜻일까요?",
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
          "no": 70,
          "stage": "S6 오답 제거 (C)",
          "tutor": "install은 '설치하다'라는 뜻이에요. are being installed가 맞으려면 창문을 설치하는 작업이 실제로 진행 중인 모습이 보여야 해요. 사진처럼 창문이 이미 설치된 상태일 때는 are installed나 have been installed라고 해야 맞아요. 꼭 주의하세요!",
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
          "no": 71,
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
          "no": 72,
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
          "no": 73,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 reading materials는 '읽을거리'라는 뜻이에요. 읽을거리는 사진에 있지만, 소파 위가 아니라 탁자 위에 있죠? 선택지에 사물은 맞아도 위치가 다르면 오답이에요.",
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
          "no": 74,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서 are being installed가 나왔어요. install은 무슨 뜻일까요?",
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
            "prompt": "선택지 C에서 are being installed가 나왔어요. install은 무슨 뜻일까요?",
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
          "no": 75,
          "stage": "S6 오답 제거 (C)",
          "tutor": "install은 '설치하다'라는 뜻이에요. are being installed가 맞으려면 창문을 설치하는 작업이 실제로 진행 중인 모습이 보여야 해요. 사진처럼 창문이 이미 설치된 상태일 때는 are installed나 have been installed라고 해야 맞아요. 꼭 주의하세요!",
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
          "no": 76,
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
          "no": 77,
          "stage": "S7 표현 정리",
          "tutor": "핵심 정리할게요. is hanging on a wall은 '벽에 걸려 있다'라는 의미로 be ing 형태이지만 상태를 나타내기도 해요. 이렇게 상태를 나타낼 수 있는 be ing 표현은 외워두는 게 좋아요. be wearing '~을 착용하고 있다'는 사진에서 사람이 옷을 입는 동작이 아니라 착용한 상태일 때 쓸 수 있어요. 또 be holding '~을 들고 있다'는 무언가를 집어드는 동작이 아니라 이미 들고 있는 상태일 때 쓸 수 있어요. be riding '~을 타고 있다'는 버스를 타고 있는 상태이를 때 쓸 수 있다는 점 꼭 외워두세요!",
          "focusQ": 1,
          "tip": {
            "body": [
              "is hanging은 벽에 걸려 있는 상태를 나타내기도 한다",
              "<사진에서 지속 상태·상황을 나타내는 be -ing 표현>",
              "• be wearing ~을 착용하고 있다",
              "→ 옷을 ‘입는 동작’이 아니라 착용 상태",
              "• be holding ~을 들고 있다",
              "→ 집어 드는 동작이 아니라 들고 있는 상태",
              "• be riding ~을 타고 있다",
              "→ 버스 등을 타고 있는 상태"
            ],
            "vocab": [
              {
                "en": "reading material",
                "ko": "읽을거리"
              },
              {
                "en": "install",
                "ko": "설치하다"
              },
              {
                "en": "potted plant",
                "ko": "화분"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 78,
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
          "no": 79,
          "stage": "S5 정답 근거 연결",
          "tutor": "인물의 동작을 나타내는 표현 is resting her arm이 나왔어요. rest on 은 무슨 뜻일까요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "인물의 동작을 나타내는 표현 is resting her arm이 나왔어요. rest on 은 무슨 뜻일까요?",
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
          "no": 80,
          "stage": "S5 정답 근거 연결",
          "tutor": "rest one's arm on 은 '~에 팔을 기대다'라는 뜻이에요. 한 여자가 a glass counter, 유리 진열대 에 팔을 기대고 있다는 의미예요. 인물의 동작과 위치 모두 일치하니깐 정답이에요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 81,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A에서는 is reaching into, a shopping cart. 라고 했어요. reach into 는 '~으로 손을 뻗다'라는 의미예요. 사진 속 여자가 손을 뻗고 있기는 하지만 쇼핑 카트 안으로 뻗는 거는 아니죠? 이렇게 인물의 동작이 일치하더라도, 뒤에 나오는 위치까지 맞는지 확인해야 해요.",
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
          "no": 82,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서는 pushing a button on a cash register라고 했는데, 일단 사진에 계산대 버튼은 없죠? 이렇게 사진에 없는 단어가 나오면 빠르게 X하고 넘어가요.",
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
          "no": 83,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D에서는 여자 중 한 명이 opening a display case, 진열장을 열고 있다고 했어요. 사진 대충 보면 헷갈릴 수 있어서 주의해야 해요. 여자가 진열장에 손을 뻗고 있지만, 열고 있는 건 아니죠. 이렇게 핵심 동작을 정확히 확인해야 해요.",
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
          "no": 84,
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
          "no": 85,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A에서는 is reaching into, a shopping cart. 라고 했어요. reach into 는 '~으로 손을 뻗다'라는 의미예요. 사진 속 여자가 손을 뻗고 있기는 하지만 쇼핑 카트 안으로 뻗는 거는 아니죠? 이렇게 인물의 동작이 일치하더라도, 뒤에 나오는 위치까지 맞는지 확인해야 해요.",
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
          "no": 86,
          "stage": "S6 오답 제거 (C)",
          "tutor": "선택지 C에서는 pushing a button on a cash register라고 했는데, 일단 사진에 계산대 버튼은 없죠? 이렇게 사진에 없는 단어가 나오면 빠르게 X하고 넘어가요.",
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
          "no": 87,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D에서는 여자 중 한 명이 opening a display case, 진열장을 열고 있다고 했어요. 사진 대충 보면 헷갈릴 수 있어서 주의해야 해요. 여자가 진열장에 손을 뻗고 있지만, 열고 있는 건 아니죠. 이렇게 핵심 동작을 정확히 확인해야 해요.",
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
          "no": 88,
          "stage": "S7 표현 정리",
          "tutor": "핵심 정리할게요. 사람의 자세를 묘사하는 문제는 신체 부위와 전치사까지 같이 들어야 해요. rest one's arm on ~처럼 '팔을 어디에 기대는지', reach into ~처럼 '어디를 향해 손을 뻗는지'가 중요해요. 동작이 비슷해 보여도 on / into 같은 전치사 뒤 위치가 다르면 오답이에요",
          "focusQ": 2,
          "tip": {
            "body": [
              "사람의 자세를 묘사하는 문제는 신체 부위 + 전치사를 확인한다"
            ],
            "vocab": [
              {
                "en": "rest one’s arm on",
                "ko": "~에 팔을 기대다"
              },
              {
                "en": "reach into",
                "ko": "~으로 손을 뻗다"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 89,
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
          "no": 90,
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
          "no": 91,
          "stage": "S5 정답 근거 연결",
          "tutor": "사진에서 책상이 파티션으로 나뉘어 있는 상태이죠? 사물 사진에서는 이렇게 사물이 어떤 상태로 배치돼 있는지를 정확하게 들어야 해요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 92,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A 에서 are being emptied는 쓰레기통이 비워지고 있는 중이라는 뜻이에요. 쓰레기통이 있지만 누군가에 의해 비워지고 있지는 않죠? be being p.p.가 들리면 실제 그 행동이 진행 되는 중인지 꼭 확인하세요.",
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
          "no": 93,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 along은 '~를 따라서'라는 의미예요. be positioned는 무슨 의미일까요?",
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
            "prompt": "선택지 B에서 along은 '~를 따라서'라는 의미예요. be positioned는 무슨 의미일까요?",
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
          "no": 94,
          "stage": "S6 오답 제거 (B)",
          "tutor": "have been positioned는 '배치되어 있다'라는 의미예요. 의자들이 along a wall, 벽을 따라 놓여 있다고 했어요. 그런데 사진의 의자 위치와 다르죠? 이렇게 위치를 나타내는 전치사 표현도 잘 알아두어야 함정에 안넘어갑니다.",
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
          "no": 95,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D에서는 There is a stack of documents 서류 더미가 있다, at each workstation. 각 업무공간마다 라고 했죠. 그런데 사진에 a stack of documents, 서류 더미가 보이지 않으니까 오답이에요.",
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
          "no": 96,
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
          "no": 97,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A 에서 are being emptied는 쓰레기통이 비워지고 있는 중이라는 뜻이에요. 쓰레기통이 있지만 누군가에 의해 비워지고 있지는 않죠? be being p.p.가 들리면 실제 그 행동이 진행 되는 중인지 꼭 확인하세요.",
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
          "no": 98,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B에서 along은 '~를 따라서'라는 의미예요. be positioned는 무슨 의미일까요?",
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
            "prompt": "선택지 B에서 along은 '~를 따라서'라는 의미예요. be positioned는 무슨 의미일까요?",
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
          "no": 99,
          "stage": "S6 오답 제거 (B)",
          "tutor": "have been positioned는 '배치되어 있다'라는 의미예요. 의자들이 along a wall, 벽을 따라 놓여 있다고 했어요. 그런데 사진의 의자 위치와 다르죠? 이렇게 위치를 나타내는 전치사 표현도 잘 알아두어야 함정에 안넘어갑니다.",
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
          "no": 100,
          "stage": "S6 오답 제거 (D)",
          "tutor": "D에서는 There is a stack of documents 서류 더미가 있다, at each workstation. 각 업무공간마다 라고 했죠. 그런데 사진에 a stack of documents, 서류 더미가 보이지 않으니까 오답이에요.",
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
          "no": 101,
          "stage": "S7 표현 정리",
          "tutor": "핵심 정리할게요. 사물 사진에서는 동사 뒤의 전치사구가 정답을 가르는 경우가 많아요. 특히 along / against / beside / near 같은 위치나 방향과 관련된 전치사 표현을 잘 알아두어야 해요.",
          "focusQ": 3,
          "tip": {
            "body": [
              "사물 사진에서는 동사 뒤의 전치사구를 주의해서 확인한다.",
              "• along '~를 따라서'",
              "• against '~에 기대어, ~을 등지고'",
              "• beside '~의 옆에'",
              "• near '의 가까이에'"
            ],
            "vocab": [
              {
                "en": "partition",
                "ko": "칸막이"
              },
              {
                "en": "be positioned",
                "ko": "배치되어 있다"
              },
              {
                "en": "along",
                "ko": "~을 따라"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        }
      ],
    },
    'RC-P5-08': {
      intro: {
        "script": "오늘은 Part 5에서 자주 나오는 능동태와 수동태 문제를 공부해볼 거예요. 공식처럼 몇 가지 사항들만 잘 익히면 빠르게 풀고 넘어갈 수 있는 유형이에요. 핵심은 동사의 목적어가 있는지 없는지 파악하는 거예요. 그럼 수업하러 가볼까요?",
        "points": [
          "빈칸이 동사 자리인지 확인하기",
          "동사의 목적어 유무 확인하기",
          "주어와 동사의 의미 관계 확인하기"
        ]
      },
      conceptTip: {
        "body": [
          "1. 빈칸이 ( ① ________ )인지 확인한다.",
          "2. 빈칸 뒤에 동사의 ( ② ________ )가 있는지 확인한다.",
          "3. 주어가 동작을 ( ③ ________ )인지, 동작을 ( ④ ________ )인지 확인한다."
        ],
        "vocab": []
      },
      summary: [
        {
          "title": "Part 5 능동태·수동태 핵심 정리",
          "intro": "오늘 배운 내용을 빠르게 정리해볼게요. 빈칸에 들어갈 알맞은 말을 직접 말하거나 글로 입력해서 배운 내용을 확인해보세요!",
          "items": [
            {
              "id": "s1_1",
              "head": "능동태·수동태 풀이 순서",
              "en": "All component parts of Lowry automatic doors ＿＿＿ for easy replacement.\n능동태·수동태 문제는 아래 순서로 확인한다.\n① 먼저 빈칸이 ___ 자리인지 확인한다.",
              "ko": "맞아요. 능동태·수동태 문제는 첫째, 동사 자리인지 확인해야 해요.",
              "answer": "동사",
              "choices": [],
              "keywords": [
                "동사"
              ]
            },
            {
              "id": "s1_2",
              "en": "② 빈칸의 자리를 확인했으면, 뒤에 동사의 ___가 있는지 확인한다.",
              "ko": "그렇죠. 빈칸이 동사 자리인지 확인했으면 동사의 목적어가 있는지 확인해야 해요.",
              "answer": "목적어",
              "choices": [],
              "keywords": [
                "목적어"
              ]
            },
            {
              "id": "s1_3",
              "en": "③ 마지막으로 주어와 동사의 ___를 확인한다.",
              "ko": "맞아요. 마지막으로 주어와 동사의 의미 관계를 확인하면 돼요.",
              "answer": "의미 관계",
              "choices": [],
              "keywords": [
                "의미 관계"
              ]
            },
            {
              "id": "s1_4",
              "head": "추가 확인 포인트",
              "en": "능수동을 판단한 뒤 선택지가 여러 개 남으면 마지막으로 ___까지 확인한다.",
              "ko": "그렇죠. 능수동을 판단하고도 선택지가 남으면 주어의 수와 시제를 확인하세요.",
              "answer": "수와 시제",
              "choices": [],
              "keywords": [
                "수와 시제"
              ]
            },
            {
              "id": "s1_5",
              "head": "자동사·타동사 모두 가능한 동사",
              "en": "alter / change / increase / decrease처럼 자동사와 타동사로 모두 쓰일 수 있는 동사는 목적어 유무만 보고 판단하지 말고 ___까지 함께 확인한다.",
              "ko": "그렇죠. 이런 동사는 목적어 유무만 보고 바로 판단하면 안 돼요. 주어가 직접 변하는지, 누군가에 의해 변화되는지도 같이 확인하세요.",
              "answer": "주어와 동사의 의미 관계",
              "choices": [],
              "keywords": [
                "주어와 동사의 의미 관계",
                "의미"
              ]
            },
            {
              "id": "s1_6",
              "head": "관계대명사 뒤 능동태·수동태",
              "en": "the building that ＿＿＿\n'선행사 + who / which / that + 동사 빈칸' 구조에서는 ___가 행동의 주체인지 대상인지 확인한다.",
              "ko": "맞아요. 관계사절에서도 판단 방법은 똑같아요. 선행사가 행동을 받는 대상이면 수동태를 선택하면 됩니다.",
              "answer": "선행사",
              "choices": [],
              "keywords": [
                "선행사"
              ]
            },
            {
              "id": "s1_7",
              "head": "5형식 문장 구조",
              "en": "Ms. Levy directed the team to provide frequent progress updates.\ndirect / require / ask / allow / encourage / advise는 동사 + ___ + to부정사 구조로 자주 나온다.",
              "ko": "맞아요. 사람 목적어 뒤에 to 부정사가 이어지는 구조예요. 이 동사들은 구조째 묶어서 기억해두세요.",
              "answer": "목적어",
              "choices": [],
              "keywords": [
                "목적어",
                "사람"
              ]
            }
          ]
        },
        {
          "title": "핵심 빈출 표현 정리",
          "intro": "마지막으로 오늘 문제에서 나온 토익 빈출 표현을 확인해볼게요. 영어 표현을 보고 알맞은 뜻을 골라보세요.",
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
              "answer": "(업무 등을) 맡다",
              "choices": [
                "중단하다",
                "평가하다",
                "(업무 등을) 맡다"
              ],
              "keywords": [
                "(업무 등을) 맡다"
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
          "stage": "S3 개념 코칭 (1)",
          "tutor": "능동태와 수동태를 구별할 때는 3 가지 포인트를 알면 돼요. 같이 포인트 짧게 짚어보고 문제 풀어볼게요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          },
          "board": true
        },
        {
          "no": 2,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (2)",
          "tutor": "첫째, 빈칸 앞뒤를 보고 어떤 자리인지 확인해야 해요. 빈칸이 어떤 자리여야 능수동을 판별할 수 있을까요?",
          "focusQ": 0,
          "tipAt": [
            {
              "n": 1,
              "text": "동사 자리"
            }
          ],
          "interaction": {
            "kind": "choice",
            "prompt": "첫째, 빈칸 앞뒤를 보고 어떤 자리인지 확인해야 해요. 빈칸이 어떤 자리여야 능수동을 판별할 수 있을까요?",
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
          },
          "board": true
        },
        {
          "no": 3,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (3)",
          "tutor": "능동태/수동태는 결국 \"동사의 형태\"를 고르는 문제이기 때문에, 빈칸이 진짜 동사 자리인지부터 확인해야 해요. 만약에 문장에 이미 본동사가 있는데 빈칸이 또 있다면 빈칸은 동사 자리가 아닐 가능성이 높아요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          },
          "board": true
        },
        {
          "no": 4,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (4)",
          "tutor": "빈칸이 동사 자리인 거 확인했으면 둘째, 빈칸 뒤에 뭐가 있는지 확인해야 할까요?",
          "focusQ": 0,
          "tipAt": [
            {
              "n": 2,
              "text": "목적어"
            }
          ],
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
          },
          "board": true
        },
        {
          "no": 5,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (5)",
          "tutor": "동사의 목적어가 있는지 확인하는 것이 핵심이에요. 빈칸 뒤에 목적어가 있으면 능동태, 목적어 없으면 수동태일 가능성이 높아요. 그런데 여기서 잠깐! 목적어가 없다고 무조건 수동태는 아니에요. 자동사는 원래 목적어를 쓰지 않기 때문에 의미까지 한 번 더 확인해야 해요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          },
          "board": true
        },
        {
          "no": 6,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S3 개념 코칭 (6)",
          "tutor": "그래서 셋째, 주어와 동사의 의미 관계를 확인해야 해요. 주어가 동작을 \"직접 하는 주체\"면 능동태, 주어가 동작을 \"당하는 대상\"이면 수동태 be + p.p.예요.",
          "focusQ": 0,
          "tipAt": [
            {
              "n": 3,
              "text": "직접 하는 주체"
            },
            {
              "n": 4,
              "text": "당하는 대상"
            }
          ],
          "interaction": {
            "kind": "next"
          },
          "board": true,
          "tip": {
            "body": [
              "1. 빈칸이 동사 자리인지 확인한다.",
              "2. 빈칸 뒤에 동사의 목적어가 있는지 확인한다.",
              "3. 주어가 동작을 직접 하는 주체인지, 동작을 당하는 대상인지 확인한다."
            ],
            "vocab": []
          }
        },
        {
          "no": 7,
          "itemSeq": 1,
          "occurrence": 1,
          "stage": "S2 유형·역할 판별",
          "tutor": "자, 그러면 문제 보면 가장 먼저 빈칸 앞뒤 확인해서 동사 자리인지 확인해야 한다고 했죠? 문장 구조 잘 보면서 문제 풀어보세요.",
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
          "tutor": "빈칸 앞에 be동사에 동그라미 쳐보세요.",
          "focusQ": 0,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "mark",
            "prompt": "빈칸 앞에 be동사에 동그라미 쳐보세요.",
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
          "tutor": "빈칸 앞에 be동사 are이 나왔죠? be동사 뒤 빈칸에는 -ing, p.p., 명사 같은 형태가 올 수 있어요. 이럴 때는 -ing인지 p.p.인지 먼저 확인하세요. 빈칸 뒤에 전치사구 for easy replacement가 나왔으니까 동사의 목적어가 없죠. 또 주어인 All component parts, 모든 구성품은 표준화되는 대상이에요. 따라서 빈칸에는 수동태가 들어가야하므로 정답은 p.p. 형태인 standardized 였어요.",
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
          "tutor": "빈칸 앞에 be 동사에 동그라미 쳐보세요.",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "mark",
            "prompt": "빈칸 앞에 be 동사에 동그라미 쳐보세요.",
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
          "tutor": "빈칸 바로 앞에 are처럼 be동사가 나오면, 빈칸에는 -ing, p.p., 명사 같은 형태가 올 수 있어요. 이럴 때는 are과 함께 동사 형태를 이루는 -ing와 p.p. 중 어떤 형태가 맞는지부터 확인하는 게 좋아요.",
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
          "tutor": "능수동태를 판단할 때는 먼저 빈칸 뒤 목적어가 있는지, 없는지 확인한다고 했죠. 빈칸 뒤에 동사의 목적어가 있어요, 없어요?",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "능수동태를 판단할 때는 먼저 빈칸 뒤 목적어가 있는지, 없는지 확인한다고 했죠. 빈칸 뒤에 동사의 목적어가 있어요, 없어요?",
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
          "tutor": "빈칸 뒤의 for easy replacement는 전치사구라서 동사의 목적어가 아니죠. 다음으로 주어 동사의 의미 관계도 확인해볼게요. 주어 All component parts, 모든 구성품은, standardize, 무언가를 표준화하는 주체인가요, 표준화되는 대상인가요?",
          "focusQ": 0,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "빈칸 뒤의 for easy replacement는 전치사구라서 동사의 목적어가 아니죠. 다음으로 주어 동사의 의미 관계도 확인해볼게요. 주어 All component parts, 모든 구성품은, standardize, 무언가를 표준화하는 주체인가요, 표준화되는 대상인가요?",
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
          "tutor": "구성품은 표준화되는 대상이니까 수동태 are + p.p.가 필요해요. 그래서 정답은 B. standardized예요. 문장 해석해보면 \"All component parts of Lowry automatic doors , 로우리 자동문의 모든 구성품은, are standardized, 표준화되어 있다, for easy replacement, 간편한 교체를 위해\"라는 의미예요.",
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
          "tutor": "선택지 A. standardizing은 진행형으로 능동이라서 오답이에요.",
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
          "tutor": "선택지 C. standardizes는 3인칭 단수 동사죠. be동사 뒤에는 are standardizes처럼 일반 동사 형태를 바로 이어서 쓸 수는 없으므로 C는 오답이에요.",
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
          "tutor": "선택지 D. standardization 은 명사니까 문장 구조상 be동사 뒤에 보어로 올 수 있어요. 그런데 의미상 '자동문의 모든 구성품은 표준화이다'는 어색하니까 오답이에요.",
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
          "tutor": "선택지 A. standardizing은 진행형으로 능동이라서 오답이에요.",
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
          "tutor": "선택지 C. standardizes는 3인칭 단수 동사죠. be동사 뒤에는 are standardizes처럼 일반 동사 형태를 바로 이어서 쓸 수는 없으므로 C는 오답이에요.",
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
          "tutor": "선택지 D. standardization 은 명사니까 문장 구조상 be동사 뒤에 보어로 올 수 있어요. 그런데 의미상 '자동문의 모든 구성품은 표준화이다'는 어색하니까 오답이에요.",
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
          "tutor": "자, 핵심 정리할게요. standardize는 타동사로 자주 쓰이고 '~을 표준화하다'라는 의미예요. 그리고 'be p.p. + for + 명사' 구조도 수동태에서 자주 나오니까 알아두세요! 핵심 어휘는 component part 구성 부품, replacement 교체(품) 이에요.",
          "focusQ": 0,
          "tip": {
            "body": [
              "• standardize + 목적어:  '~을 표준화 하다'",
              "• 'be p.p. + for + 명사' 구조"
            ],
            "vocab": [
              {
                "en": "component part",
                "ko": "구성 부품"
              },
              {
                "en": "replacement",
                "ko": "교체(품)"
              }
            ]
          },
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
          "tutor": "이 문제도 먼저 빈칸 앞뒤를 확인해서 빈칸이 동사 자리인지 판단해야 해요. 이제 문제 풀어보세요.",
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
          "tutor": "빈칸 앞에 조동사 cannot이 왔으므로 빈칸은 동사원형이 들어갈 자리였죠? 조동사가 있어도 능수동을 판단하는 방법은 똑같아요. 뒤에 목적어 없이 전치사구 by any user가 나왔고, 주어 the settings, 설정은 변경되는 대상이에요. 그래서 정답은 수동태 형태인 D. be altered 였어요.",
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
          "tutor": "빈칸 앞에 cannot은 조동사죠. 조동사 뒤에는 어떤 형태가 와야 할까요?",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "빈칸 앞에 cannot은 조동사죠. 조동사 뒤에는 어떤 형태가 와야 할까요?",
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
          "tutor": "조동사 뒤에는 동사원형이 와야 해요. 조동사가 있어도 능수동을 판단하는 방법은 똑같아요. 빈칸 뒤 by any user은 동사의 목적어인가요, 아닌가요?",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "조동사 뒤에는 동사원형이 와야 해요. 조동사가 있어도 능수동을 판단하는 방법은 똑같아요. 빈칸 뒤 by any user은 동사의 목적어인가요, 아닌가요?",
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
          "tutor": "전치사구는 동사의 목적어가 될 수 없어요. 여기서 by any user는 중요한 힌트예요. 'by + 행위자'가 나오면 수동태인지 먼저 의심해야 해요. 이제 주어 동사의 의미 관계를 볼게요.이 문장의 주어 The settings '설정'은 무언가를 변경하는 주체예요, 변경되는 대상이에요?",
          "focusQ": 1,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "전치사구는 동사의 목적어가 될 수 없어요. 여기서 by any user는 중요한 힌트예요. 'by + 행위자'가 나오면 수동태인지 먼저 의심해야 해요. 이제 주어 동사의 의미 관계를 볼게요.이 문장의 주어 The settings '설정'은 무언가를 변경하는 주체예요, 변경되는 대상이에요?",
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
          "no": 34,
          "itemSeq": 2,
          "occurrence": 2,
          "stage": "S4 구조·흐름 파악",
          "tutor": "설정은 변경되는 대상이니까 수동태가 필요해요. 그래서 정답은 D. be altered예요. 문장 해석해보면 'The settings in your Buzz virtual meeting room, 버즈 가상 회의실의 설정은, cannot be altered, 변경될 수 없다, by any user, 어떤 사용자에 의해서도, without the 10-digit control code, 10자리 제어 코드 없이는.' 이에요.",
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
          "tutor": "선택지 B. alter는 동사원형이라 형태는 가능하지만 능동이니까 오답이에요.",
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
          "tutor": "선택지 B. alter는 동사원형이라 형태는 가능하지만 능동이니까 오답이에요.",
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
          "tutor": "이제 핵심 정리할게요. 동사 alter 은 자동사와 타동사로 모두 쓰이는 동사라서 잘 알아두어야 해요. 자동사일 때는 '달라지다'라는 의미고, 타동사일 때는 '~을 변경하다'라는 의미예요. 따라서 alter 뒤의 목적어만 보고 바로 답을 고르면 안되고 주어가 직접 변화하는지, 누군가에 의해 변경되는지 의미를 확인해야 해요. alter처럼 자동사와 타동사 모두 가능한 동사는 change, increase, decrease가 있어요. 외워두고 가세요!",
          "focusQ": 1,
          "tip": {
            "body": [
              "alter",
              "1. (자동사) '달라지다'",
              "2. (타동사) + 목적어: '~을 변경하다'",
              "→ 주어가 직접 변화하는지, 누군가에 의해 변경되는지 의미를 확인",
              "• 자동사/타동사 모두 가능한 변화 동사: alter, change, increase, decrease 등"
            ],
            "vocab": []
          },
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
          "tutor": "이 문제도 마찬가지로 빈칸 자리가 동사 자리인지 확인부터 해야 해요. 그럼 이제 문제 풀어보세요.",
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
          "tutor": "빈칸 앞에는 주어 Ms. Levy가 있고, 뒤에는 목적어로 명사구 the team이 나왔어요. 여기서 문장 구조 잠깐 보고 갈게요. 'direct + 목적어 + to 부정사'는 '~에게 ~ 하라고 지시하다'라는 의미예요. 따라서 빈칸은 동사 자리이고, 능동태가 들어가야하는 거를 알 수 있죠. 이런 5형식 형태는 자주 나오는 문장 구조니까 잘 알아두면 좋아요.",
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
          "tutor": "능동태가 될 수 있는 선택지는 A. directed, B. direct, C. is directing 세 개나 있어요. 이럴 때는 마지막으로, 동사의 수와 시제까지 확인해야 해요. 앞의 when절의 동사 took over에 동그라미 쳐보세요.",
          "focusQ": 2,
          "gate": "ifCorrect",
          "interaction": {
            "kind": "mark",
            "prompt": "능동태가 될 수 있는 선택지는 A. directed, B. direct, C. is directing 세 개나 있어요. 이럴 때는 마지막으로, 동사의 수와 시제까지 확인해야 해요. 앞의 when절의 동사 took over에 동그라미 쳐보세요.",
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
          "tutor": "when절에서 과거 시제가 쓰였으므로 문맥상 주절의 시제도 과거 시제가 들어가는 게 자연스러워요. 따라서 정답은 A. directed 였어요.",
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
          "tutor": "빈칸 앞뒤부터 확인할게요. 빈칸 앞에는 주어 Ms. Levy가 있고 문장의 동사가 없으니까 빈칸은 동사 자리예요.",
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
          "tutor": "동사 자리인 거 확인했으면 빈칸 뒤에 목적어가 있는지 확인해야 한다고 했어요. the team은 동사의 목적어일까요?",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "동사 자리인 거 확인했으면 빈칸 뒤에 목적어가 있는지 확인해야 한다고 했어요. the team은 동사의 목적어일까요?",
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
          "tutor": "명사구 the team은 동사의 목적어예요. 목적어가 나왔으니까 능동태일 가능성이 높겠죠? 여기서 문장 구조 잠깐 보고 갈게요. 'direct + 목적어 + to 부정사'는 '~에게 ~ 하라고 지시하다'라는 의미예요. 그럼 의미적으로도 Ms. Levy가 팀에게 지시했다라는 능동의 의미가 되죠?",
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
          "tutor": "그러면 능동태가 될 수 있는 선택지는 A. directed, B. direct, C. is directing 세 개나 있어요. 이럴 때는 마지막으로, 동사의 수와 시제까지 확인해야 해요. 앞의 When she took over the project은 어떤 시제가 쓰였나요?",
          "focusQ": 2,
          "gate": "ifWrong",
          "interaction": {
            "kind": "choice",
            "prompt": "그러면 능동태가 될 수 있는 선택지는 A. directed, B. direct, C. is directing 세 개나 있어요. 이럴 때는 마지막으로, 동사의 수와 시제까지 확인해야 해요. 앞의 When she took over the project은 어떤 시제가 쓰였나요?",
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
          "tutor": "과거 동사 took over이 왔으므로 프로젝트를 맡았던 과거 시점의 이야기죠. 그래서 주절인 빈칸에도 과거 시점을 나타내는 선택지가 들어가는 게 자연스러워요. 따라서 정답은 A. directed 예요. 문장 해석하면, 'When she took over the project, 프로젝트를 맡았을 때, Ms. Levy, 레비 씨는, directed, 지시했다, the team, 팀에게, to provide frequent progress updates over the next month, 다음 한 달 동안 진행 상황보고를 자주 하라고' 예요.",
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
          "tutor": "핵심 정리해볼게요. 능수동태 문제는 먼저 빈칸 뒤에 목적어 유무를 확인하고, 주어와 동사의 관계를 확인한다고 했어요. 그런데도 선택지가 남으면 시제까지 확인하면 돼요. 그리고 특히 5형식으로 대표적으로 쓰이는 동사 direct / require / ask / allow / encourage / advise 뒤에 사람 목적어와 to 부정사가 나오는 구조도 잘 외우두세요. 빈출 표현은 take over 업무 등을 맡다, frequent 잦은, progress 진행 이에요.",
          "focusQ": 2,
          "tip": {
            "body": [
              "direct / require / ask / allow / encourage / advise  + 사람 + to V"
            ],
            "vocab": [
              {
                "en": "take over (",
                "ko": "업무 등을) 맡다"
              },
              {
                "en": "frequent",
                "ko": "잦은"
              },
              {
                "en": "progress",
                "ko": "진행"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 63,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "마무리 멘트",
          "tutor": "좋아요. 이제 실전 문제로 넘어가 볼게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 146,
          "itemSeq": 3,
          "occurrence": 3,
          "stage": "실전 안내",
          "tutor": "유형 학습에서 배웠던 전략이랑 개념 적용해서 총 6 문제 실전처럼 풀어볼 거예요. 시작할게요.",
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
          "tutor": "빈칸 바로 앞에 will be가 있죠? be 동사 뒤에는 -ing, p.p., 명사 같은 형태가 올 수 있다고 했어요. 그럼 먼저 -ing와 p.p. 중 맞는 형태를 확인해볼게요.",
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
          "tutor": "for Cordell residents는 전치사구라서 동사의 목적어가 될 수 없어요. 목적어가 없으니까 수동태일 가능성이 높아요. 그럼 주어 동사의 의미 관계도 확인할게요. 주어 entry fee, 입장료, 동사 waive는 면제하다 라는 뜻이에요. 입장료는 면제하는 주체인가요, 면제되는 대상인가요?",
          "focusQ": 0,
          "interaction": {
            "kind": "choice",
            "prompt": "for Cordell residents는 전치사구라서 동사의 목적어가 될 수 없어요. 목적어가 없으니까 수동태일 가능성이 높아요. 그럼 주어 동사의 의미 관계도 확인할게요. 주어 entry fee, 입장료, 동사 waive는 면제하다 라는 뜻이에요. 입장료는 면제하는 주체인가요, 면제되는 대상인가요?",
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
          "no": 67,
          "stage": "S5 정답 근거 연결",
          "tutor": "입장료는 면제되는 대상이죠. 따라서 수동태가 필요한 게 확실해졌어요.그래서 정답은 C. waived예요. will be waived, '입장료가 면제될 것이다'라는 미래를 나타내는 수동태가 적절해요.",
          "focusQ": 0,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 68,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A. waives는 3인칭 단수 동사이니까 이미 be동사가 나온 시점에서 동사를 또 쓸 수 없으니 오답이에요.",
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
          "tutor": "선택지 D. waivers 는 명사라서 문장 구조상으로는 be동사 뒤에 보어로 들어갈 수 있어요. 그런데 의미상 '입장료는 면제 증서일 것이다'가 되어 어색해져버리죠. 따라서 D는 오답이에요.",
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
          "tutor": "선택지 A. waives는 3인칭 단수 동사이니까 이미 be동사가 나온 시점에서 동사를 또 쓸 수 없으니 오답이에요.",
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
          "tutor": "선택지 D. waivers 는 명사라서 문장 구조상으로는 be동사 뒤에 보어로 들어갈 수 있어요. 그런데 의미상 '입장료는 면제 증서일 것이다'가 되어 어색해져버리죠. 따라서 D는 오답이에요.",
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
          "tutor": "빈출 표현 정리할게요. 타동사 waive는 '~을 면제하다'라는 의미로 같이 쓰는 표현을 외워두는 게 좋아요. waive a fee '비용을 면제하다', waive a charge '요금을 면제하다', waive a requirement '요건을 면제하다' 이런식으로 자주 쓰여요.",
          "focusQ": 0,
          "tip": {
            "body": [
              "waive + 목적어:  '~을 면제하다'",
              "• waive a fee 비용을 면제하다",
              "• waive a charge 요금을 면제하다",
              "• waive a requirement 요건을 면제하다"
            ],
            "vocab": [
              {
                "en": "entry fee",
                "ko": "는 입장료"
              },
              {
                "en": "resident",
                "ko": "는 주민"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 76,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞뒤 먼저 확인할게요. 빈칸은 무슨 자리인가요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "빈칸 앞뒤 먼저 확인할게요. 빈칸은 무슨 자리인가요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "주어"
              },
              {
                "text": "동사",
                "correct": true
              },
              {
                "text": "보어"
              }
            ]
          }
        },
        {
          "no": 77,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞에는 주어 Romesh Sastry가 있고 문장에 동사가 아직 없죠? 그러면 빈칸은 동사 자리예요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 78,
          "stage": "S4 구조·흐름 파악",
          "tutor": "동사 자리인 거 확인했으면 이제 능동인지 수동인지 확인하면 돼요. 먼저 빈칸 뒤에 동사의 목적어 있어요, 없어요?",
          "focusQ": 1,
          "interaction": {
            "kind": "choice",
            "prompt": "동사 자리인 거 확인했으면 이제 능동인지 수동인지 확인하면 돼요. 먼저 빈칸 뒤에 동사의 목적어 있어요, 없어요?",
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
          "no": 79,
          "stage": "S4 구조·흐름 파악",
          "tutor": "전치사구 as the editor-in-chief는 동사의 목적어가 될 수 없어요. 그러면 빈칸 뒤에 동사의 목적어가 없는 거죠. 일단 수동태일 가능성이 높아요. 의미도 확인해볼게요. appoint는 '~을 임명하다'라는 뜻이라 능동태로 쓰려면 누구를 임명했는지 대상이 목적어로 나와야 해요. 그런데 이 문장에는 그런 목적어가 없죠. 반대로 Romesh Sastry가 '편집장으로 임명되었다'라고 보면 의미도 자연스러워요. 따라서 수동태가 필요해요.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 80,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 A. was appointed 예요. 뒤에 목적어가 없고, yesterday까지 있으니까 과거 수동태 was appointed가 확실하죠.",
          "focusQ": 1,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 81,
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
          "no": 82,
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
          "no": 83,
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
          "no": 84,
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
          "no": 85,
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
          "no": 86,
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
          "no": 87,
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
          "no": 88,
          "stage": "S7 표현 정리",
          "tutor": "빈출 표현 정리할게요. appoint는 '임명하다'라는 뜻으로 뒤에 'as + 직책/역할'이 나와서 appoint A as B 'A를 B로 임명하다'라는 표현으로 자주 쓰여요. 이런 형태로 또 자주 나오는 수동 표현은 be selected as '~로 선정되다', be named as '~로 지명되다', be elected as '~로 선출되다'가 있어요. 따라서 'as + 직책/역할'이 뒤에 나오면 앞에 appoint / select / name / elect 같은 동사가 나올 수 있다는 점 유의하세요!",
          "focusQ": 1,
          "tip": {
            "body": [
              "appoint + 목적어 + as + 직책:  '~을 ~로 임명하다'",
              "→ be appointed as ~로 임명되다",
              "• be selected as ~로 선정되다",
              "• be named as ~로 지명되다",
              "• be elected (as) ~로 선출되다"
            ],
            "vocab": []
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 89,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞뒤 먼저 확인할게요. 빈칸은 무슨 자리인가요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "빈칸 앞뒤 먼저 확인할게요. 빈칸은 무슨 자리인가요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "주어"
              },
              {
                "text": "동사",
                "correct": true
              },
              {
                "text": "보어"
              }
            ]
          }
        },
        {
          "no": 90,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞에는 주어 All of Nakano Furniture's products가 있고, 동사가 없으므로 빈칸은 동사 자리예요. 그러면 이제 동사의 능수동 확인해볼게요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 91,
          "stage": "S4 구조·흐름 파악",
          "tutor": "동사 assemble은 '조립하다'라는 뜻이에요. 빈칸 뒤에 동사의 목적어가 있나요, 없나요?",
          "focusQ": 2,
          "interaction": {
            "kind": "choice",
            "prompt": "동사 assemble은 '조립하다'라는 뜻이에요. 빈칸 뒤에 동사의 목적어가 있나요, 없나요?",
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
          "no": 92,
          "stage": "S4 구조·흐름 파악",
          "tutor": "뒤에 piece by piece는 '하나씩'이라는 뜻의 부사구예요. 부사구는 동사 assemble의 목적어가 될 수 없어요. 그리고 뒤에 by expert carpenters, '전문 목수들에 의해'라는 표현 나왔죠. 'by + 행위자'가 나오면 수동태인지 의심해보라고 했어요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 93,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그럼 이제 주어 동사의 의미 관계도 확인할게요. 주어인 '나카노 가구의 모든 제품'은 조립되는 대상이니깐 수동태가 필요해요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 94,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 D. are assembled예요. 동사의 목적어가 없고, 제품도 조립되는 대상이므로 수동태 are assembled, '조립된다'가 적절해요.",
          "focusQ": 2,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 95,
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
          "no": 96,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. assembled는 동사의 과거형으로 쓰일 수 있어서 능동태라서 오답이죠.",
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
          "no": 97,
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
          "no": 98,
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
          "no": 99,
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
          "no": 100,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. assembled는 동사의 과거형으로 쓰일 수 있어서 능동태라서 오답이죠.",
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
          "no": 101,
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
          "no": 102,
          "stage": "S7 표현 정리",
          "tutor": "빈출 표현 정리할게요. 여기서 assemble은 자동사/타동사 둘다 쓸 수 있어서 잘 알아두고 가야 해요. 자동사로 쓰일 때는 The employees assembled in the lobby. '직원들이 로비에 모였다' 처럼 '모이다'로도 쓰여요. 반면, 타동사로 쓸 때는 assemble furniture '가구를 조립하다'처럼 '~을 조립하다'라는 의미로 쓰여요. 이렇게 자/타동사로 쓰였을 때의 의미 차이 꼭 외워두고 가세요!",
          "focusQ": 2,
          "tip": {
            "body": [
              "assemble",
              "1. (자동사) '모이다'",
              "2. (타동사) + 목적어: '~을 조립하다'",
              "→ 자동사/타동사 둘 다 가능한 동사는 ‘목적어 유무 + 주어 의미’를 함께 확인"
            ],
            "vocab": []
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 103,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞뒤 먼저 확인할게요. 빈칸은 무슨 자리인가요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "빈칸 앞뒤 먼저 확인할게요. 빈칸은 무슨 자리인가요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "동사",
                "correct": true
              },
              {
                "text": "목적어"
              },
              {
                "text": "보어"
              }
            ]
          }
        },
        {
          "no": 104,
          "stage": "S2 유형·역할 판별",
          "tutor": "빈칸 앞에는 주어 Ms.Chin 이 있고 문장에 동사가 없으므로 빈칸은 동사 자리죠. 빈칸이 동사 자리인 거 확인했으니, 이제 능동인지 수동인지 확인해볼게요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 105,
          "stage": "S4 구조·흐름 파악",
          "tutor": "동사 assume은 '업무를 맡다'라는 의미예요. 빈칸 뒤에 assume의 목적어가 있나요, 없나요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "동사 assume은 '업무를 맡다'라는 의미예요. 빈칸 뒤에 assume의 목적어가 있나요, 없나요?",
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
          "no": 106,
          "stage": "S4 구조·흐름 파악",
          "tutor": "뒤에 명사구 Mr.Stepp's duties 가 동사의 목적어로 나왔어요. 그러면 주어와 동사의 의미 관계도 확인해보면, 주어인 Ms.Chin은 업무를 직접 맡는 주체예요. 따라서 빈칸에는 능동태가 필요해요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 107,
          "stage": "S4 구조·흐름 파악",
          "tutor": "선택지에서 능동태인 거 찾아보면 A. assumed와 D. will assume이 있어요. 이럴 때는 마지막으로 시제를 확인하라고 했죠? while he is at a weeklong marketing seminar는 '그가 세미나에 가 있는 동안에'라는 의미예요. 그 기간 동안 Ms.Chin이 업무를 맡게 될 거라는 의미로는 어떤 시제가 자연스러울까요?",
          "focusQ": 3,
          "interaction": {
            "kind": "choice",
            "prompt": "while he is at a weeklong marketing seminar는 '그가 세미나에 가 있는 동안에'라는 의미예요. 그 기간 동안 Ms.Chin이 업무를 맡게 될 거라는 의미로는 어떤 시제가 자연스러울까요?",
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
          "no": 108,
          "stage": "S4 구조·흐름 파악",
          "tutor": "while, when 같은 시간의 부사절에는, 앞으로 일어날 일을 말할 때도 will 대신 is 같은 현재형을 쓸 수 있어요. 그러면 그 기간 동안 Ms.Chin이 업무를 맡게 될 것이라는 미래의 의미가 자연스럽죠?",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 109,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 D. will assume이에요. 동사의 목적어가 있고, 주어가 행동하는 주체이고, 미래 시제까지 맞으니까 will assume이 적절해요.",
          "focusQ": 3,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 110,
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
          "no": 111,
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
          "no": 112,
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
          "no": 113,
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
          "no": 114,
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
          "no": 115,
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
          "no": 116,
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
          "no": 117,
          "stage": "S7 표현 정리",
          "tutor": "핵심 표현 정리할게요. assume은 타동사로 쓸 때 뒤에 duties / responsibility / a position 같은 표현이 나와서 '업무/책임/직책을 맡다' 라는 의미로 쓰여요. 꼭 표현 외워두세요. 그리고 한 가지 더, while / when / before 등이 나온 시간의 부사절에서는 현재 시제로 미래를 나타낼 수 있다는 점도 알아두세요!",
          "focusQ": 3,
          "tip": {
            "body": [
              "• assume + 목적어 (duties / responsibility / a position):  ‘업무·책임·직책을 맡다’",
              "• while / when / before ... + 현재 시제, 주절 + will ~"
            ],
            "vocab": []
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 118,
          "stage": "S2 유형·역할 판별",
          "tutor": "먼저 빈칸 앞뒤부터 확인해볼게요. 빈칸 앞에 긴 주어 The layout of Pierce University's new residence hall가 나왔어요. 빈칸은 무슨 자리예요?",
          "focusQ": 4,
          "interaction": {
            "kind": "choice",
            "prompt": "먼저 빈칸 앞뒤부터 확인해볼게요. 빈칸 앞에 긴 주어 The layout of Pierce University's new residence hall가 나왔어요. 빈칸은 무슨 자리예요?",
            "fixedPrompt": true,
            "choices": [
              {
                "text": "동사",
                "correct": true
              },
              {
                "text": "목적어"
              },
              {
                "text": "보어"
              }
            ]
          }
        },
        {
          "no": 119,
          "stage": "S4 구조·흐름 파악",
          "tutor": "문장의 동사가 없으니까 빈칸은 동사 자리죠. 동사 자리인 거 확인했으니까 뒤에 목적어 있는지 확인해야 해요. 빈칸 뒤 동사 design의 목적어가 있어요, 없어요?",
          "focusQ": 4,
          "interaction": {
            "kind": "choice",
            "prompt": "문장의 동사가 없으니까 빈칸은 동사 자리죠. 동사 자리인 거 확인했으니까 뒤에 목적어 있는지 확인해야 해요. 빈칸 뒤 동사 design의 목적어가 있어요, 없어요?",
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
          "no": 120,
          "stage": "S4 구조·흐름 파악",
          "tutor": "전치사구 with input from students는 '학생들의 의견을 반영하여'라는 의미이고, 목적어가 될 수 없죠.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 121,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그러면 마지막으로 주어와 동사의 관계를 확인할게요. 이 문장의 주어 The layout '배치'는 스스로 무언가를 설계하는 주체예요, 누군가에 의해 설계되는 대상이에요?",
          "focusQ": 4,
          "interaction": {
            "kind": "choice",
            "prompt": "그러면 마지막으로 주어와 동사의 관계를 확인할게요. 이 문장의 주어 The layout '배치'는 스스로 무언가를 설계하는 주체예요, 누군가에 의해 설계되는 대상이에요?",
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
          "no": 122,
          "stage": "S4 구조·흐름 파악",
          "tutor": "layout은 누군가에 의해 설계되는 대상이죠. 따라서 빈칸에는 수동태가 필요해요.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 123,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 C. is being designed예요. 동사의 목적어도 없고, '기숙사의 배치가 설계되고 있다'는 수동의 의미가 자연스러워요. be being + p.p.는 어떤 일이 지금 진행되고 있는 수동태를 나타낼 때 써요.",
          "focusQ": 4,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 124,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A. designs는 3인칭 단수 형태로 능동태이므로 오답이에요.",
          "focusQ": 4,
          "optionRef": "A",
          "gate": "ifPicked",
          "reveal": {
            "optionText": [
              {
                "qIdx": 4,
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
          "no": 125,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. was designing 은 진행형태로 능동태이므로 오답이에요.",
          "focusQ": 4,
          "optionRef": "B",
          "gate": "ifPicked",
          "reveal": {
            "optionText": [
              {
                "qIdx": 4,
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
          "no": 126,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D. designed는 p.p. 형태가 될 수 있지만, 수동태가 되려면 앞에 be동사가 있어야 해요. 따라서 D도 오답이에요.",
          "focusQ": 4,
          "optionRef": "D",
          "gate": "ifPicked",
          "reveal": {
            "optionText": [
              {
                "qIdx": 4,
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
          "no": 127,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 4,
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
          "no": 128,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A. designs는 3인칭 단수 형태로 능동태이므로 오답이에요.",
          "focusQ": 4,
          "optionRef": "A",
          "gate": "onDemand",
          "reveal": {
            "optionText": [
              {
                "qIdx": 4,
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
          "no": 129,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. was designing 은 진행형태로 능동태이므로 오답이에요.",
          "focusQ": 4,
          "optionRef": "B",
          "gate": "onDemand",
          "reveal": {
            "optionText": [
              {
                "qIdx": 4,
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
          "no": 130,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D. designed는 p.p. 형태가 될 수 있지만, 수동태가 되려면 앞에 be동사가 있어야 해요. 따라서 D도 오답이에요.",
          "focusQ": 4,
          "optionRef": "D",
          "gate": "onDemand",
          "reveal": {
            "optionText": [
              {
                "qIdx": 4,
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
          "no": 131,
          "stage": "S7 표현 정리",
          "tutor": "핵심 표현 정리할게요. design은 '~을 설계하다'라는 의미의 타동사로 쓰일 수 있어요. 또 input은 '의견, 조언'이라는 뜻으로, with input from + 사람 형태로 쓰면 '~의 의견을 반영하여'라는 의미예요.",
          "focusQ": 4,
          "tip": {
            "body": [
              "• design + 목적어: '~을 설계하다'",
              "• with input from + 사람: '~의 의견을 반영하여'"
            ],
            "vocab": [
              {
                "en": "layout",
                "ko": "배치"
              },
              {
                "en": "residence hall",
                "ko": "기숙사"
              },
              {
                "en": "input",
                "ko": "의견, 조언"
              }
            ]
          },
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 132,
          "stage": "S2 유형·역할 판별",
          "tutor": "문제 보자마자 빈칸 앞뒤 확인해서 빈칸이 무슨 자리인지 확인해야 한다고 했죠? 빈칸 앞에 that에 동그라미 치세요.",
          "focusQ": 5,
          "interaction": {
            "kind": "mark",
            "prompt": "문제 보자마자 빈칸 앞뒤 확인해서 빈칸이 무슨 자리인지 확인해야 한다고 했죠?",
            "targetWords": [
              "that"
            ]
          }
        },
        {
          "no": 133,
          "stage": "S2 유형·역할 판별",
          "tutor": "여기서 that은 바로 앞의 the building을 수식하는 관계대명사이고, 관계사절의 주어 역할을 해요. that 뒤에는 동사가 없으니까 빈칸은 동사 자리예요.",
          "focusQ": 5,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 134,
          "stage": "S4 구조·흐름 파악",
          "tutor": "그러면 동사의 능수동을 확인해볼게요. 먼저 빈칸 뒤에 목적어 있는지 없는지 확인하라고 했죠? 뒤에 목적어가 없으니까 수동태일 가능성이 높아요.",
          "focusQ": 5,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 135,
          "stage": "S4 구조·흐름 파악",
          "tutor": "다음으로 의미 확인할게요. 선행사 the building과 동사 construct의 관계를 확인하면 돼요. 동사 construct는 '건설하다'라는 뜻이에요. 건물은 무언가를 건설하는 주체예요, 건설되는 대상이에요?",
          "focusQ": 5,
          "interaction": {
            "kind": "choice",
            "prompt": "다음으로 의미 확인할게요. 선행사 the building과 동사 construct의 관계를 확인하면 돼요. 동사 construct는 '건설하다'라는 뜻이에요. 건물은 무언가를 건설하는 주체예요, 건설되는 대상이에요?",
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
          "no": 136,
          "stage": "S4 구조·흐름 파악",
          "tutor": "건물은 건설되는 대상이죠. 그러면 빈칸에는 수동태가 들어가야겠죠?",
          "focusQ": 5,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 137,
          "stage": "S5 정답 근거 연결",
          "tutor": "그래서 정답은 C. was constructed예요. 뒤에 목적어도 없고, 건물은 지어지는 대상이니까 수동태 was constructed가 적절해요.",
          "focusQ": 5,
          "interaction": {
            "kind": "next"
          }
        },
        {
          "no": 138,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A. is constructing은 능동 진행형태이므로 오답이에요.",
          "focusQ": 5,
          "optionRef": "A",
          "gate": "ifPicked",
          "reveal": {
            "optionText": [
              {
                "qIdx": 5,
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
          "no": 139,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. constructed는 동사의 과거형으로 능동 형태로 쓸 수 있어요. 따라서 오답이에요.",
          "focusQ": 5,
          "optionRef": "B",
          "gate": "ifPicked",
          "reveal": {
            "optionText": [
              {
                "qIdx": 5,
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
          "no": 140,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D. has constructed는 동사의 완료형이므로 능동태라서 오답이에요.",
          "focusQ": 5,
          "optionRef": "D",
          "gate": "ifPicked",
          "reveal": {
            "optionText": [
              {
                "qIdx": 5,
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
          "no": 141,
          "stage": "후속 질문",
          "tutor": "혹시 오답 선택지 중에 헷갈렸거나 설명을 듣고 싶은 선택지가 있나요?",
          "focusQ": 5,
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
          "no": 142,
          "stage": "S6 오답 제거 (A)",
          "tutor": "선택지 A. is constructing은 능동 진행형태이므로 오답이에요.",
          "focusQ": 5,
          "optionRef": "A",
          "gate": "onDemand",
          "reveal": {
            "optionText": [
              {
                "qIdx": 5,
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
          "no": 143,
          "stage": "S6 오답 제거 (B)",
          "tutor": "선택지 B. constructed는 동사의 과거형으로 능동 형태로 쓸 수 있어요. 따라서 오답이에요.",
          "focusQ": 5,
          "optionRef": "B",
          "gate": "onDemand",
          "reveal": {
            "optionText": [
              {
                "qIdx": 5,
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
          "no": 144,
          "stage": "S6 오답 제거 (D)",
          "tutor": "선택지 D. has constructed는 동사의 완료형이므로 능동태라서 오답이에요.",
          "focusQ": 5,
          "optionRef": "D",
          "gate": "onDemand",
          "reveal": {
            "optionText": [
              {
                "qIdx": 5,
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
          "no": 145,
          "stage": "S7 표현 정리",
          "tutor": "핵심 표현 정리할게요. construct는 '짓다, 건설하다'라는 의미의 타동사예요. 그래서 뒤에 building/facility/road 같은 명사와 나와요. 그리고 토익에서는 관계대명사 바로 뒤에 동사 빈칸이 자주 나와요. 이럴 때는 선행사가 행동의 주체인지 대상인지 판단하면 돼요.",
          "focusQ": 5,
          "tip": {
            "body": [
              "• construct + 목적어(building/facility/road):  '~을 짓다, 건설하다'",
              "• 선행사 + who/which/that + 동사 빈칸",
              "→ 선행사가 행동의 주체인지 대상인지 판단"
            ],
            "vocab": []
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
