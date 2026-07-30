/**
 * 일레븐랩스 에이전트 System prompt 읽기 / 규칙 한 줄 추가.
 *
 * 왜 스크립트로 하나: 대시보드 프롬프트는 레포 밖(에이전트 설정)에 있어서, 코드만 고쳐도
 * 에이전트 발화는 안 바뀐다. 이름 호격 조사("와옹아" → [와옹가] 오독)처럼 **발화 쪽 규칙**은
 * 여기서만 고칠 수 있다. docs/agent-system-prompt.md 는 사본이라 같이 맞춰 둘 것.
 *
 *   node scripts/el-agent-prompt.js            # 현재 프롬프트 보기 (읽기 전용)
 *   node scripts/el-agent-prompt.js --apply     # 규칙이 없으면 덧붙인다
 *
 * ⚠️ 통째로 덮어쓰지 않는다 — 현재 프롬프트를 읽어 **끝에 규칙만** 붙인다.
 */
const fs = require('fs');

const AGENT_ID = process.argv.find((a) => a.startsWith('--agent='))?.split('=')[1]
  || 'agent_2501kt0w00khfrr8869g2z5vnpaz';   // 박혜원 (instructorData.TUTOR_AGENT_DEFAULT)
const APPLY = process.argv.includes('--apply');

const RULE = [
  '',
  '## 학생 이름 부르기 (음성 합성 규칙)',
  '- 학생 이름은 이름만 부른다. 뒤에 "아"·"야" 같은 호격 조사를 붙이지 마라.',
  '  ("와옹아" 로 부르지 말고 "와옹" 으로 부른다) 음성 합성이 이름과 조사를 붙여 엉뚱하게 읽는다.',
  '- 이름을 아예 부르지 않아도 된다. 부를 때만 이 규칙을 지킨다.',
].join('\n');

const KEY = (fs.readFileSync('.env.local', 'utf8').match(/^ELEVENLABS_API_KEY=(.*)$/m) || [])[1]?.trim();
if (!KEY) { console.error('ELEVENLABS_API_KEY 없음 (.env.local)'); process.exit(1); }

const BASE = 'https://api.elevenlabs.io/v1/convai/agents';

async function main() {
  const res = await fetch(`${BASE}/${AGENT_ID}`, { headers: { 'xi-api-key': KEY } });
  if (!res.ok) {
    console.error(`읽기 실패 ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }
  const agent = await res.json();
  const prompt = agent?.conversation_config?.agent?.prompt?.prompt ?? '';
  console.log(`에이전트: ${agent.name ?? AGENT_ID}`);
  console.log(`프롬프트 길이: ${prompt.length}자`);
  console.log(`호격 규칙 이미 있음: ${/호격 조사/.test(prompt) ? '예' : '아니오'}`);

  if (!APPLY) {
    console.log('\n--- 프롬프트 끝 400자 ---\n' + prompt.slice(-400));
    console.log('\n(적용하려면 --apply)');
    return;
  }
  if (/호격 조사/.test(prompt)) { console.log('이미 반영됨 — 아무것도 안 한다.'); return; }

  fs.writeFileSync('scripts/_el_prompt_backup.txt', prompt, 'utf8');   // 되돌릴 수 있게
  const patch = await fetch(`${BASE}/${AGENT_ID}`, {
    method: 'PATCH',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_config: { agent: { prompt: { prompt: prompt + '\n' + RULE } } },
    }),
  });
  if (!patch.ok) {
    console.error(`적용 실패 ${patch.status}: ${(await patch.text()).slice(0, 300)}`);
    process.exit(1);
  }
  console.log('규칙 추가 완료 (원본은 scripts/_el_prompt_backup.txt 에 백업)');
}
main().catch((e) => { console.error(e.message); process.exit(1); });
