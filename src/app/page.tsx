export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F0F5FF] p-6">
      <div className="ybm-card p-8 max-w-sm w-full text-center space-y-4">

        {/* 아이콘 뱃지 */}
        <div className="flex justify-center">
          <div className="ybm-icon-badge w-16 h-16">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4C9.373 4 4 9.373 4 16c0 2.11.548 4.09 1.508 5.808L4 28l6.192-1.508A11.952 11.952 0 0016 28c6.627 0 12-5.373 12-12S22.627 4 16 4z"
                fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
        </div>

        {/* 타이틀 */}
        <div>
          <h1 className="ybm-title text-2xl">YBM AI 어학원</h1>
          <p className="ybm-subtitle mt-1">나만의 토익 AI 강사</p>
        </div>

        {/* 상태 */}
        <div className="bg-[#D6EAFF] rounded-xl px-4 py-3">
          <p className="text-[#2277F0] text-sm font-medium">환경 세팅 완료 ✅</p>
          <p className="text-[#6B7A99] text-xs mt-0.5">개발 진행 중...</p>
        </div>

      </div>
    </main>
  );
}
