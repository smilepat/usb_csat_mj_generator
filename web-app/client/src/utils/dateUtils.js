/**
 * 날짜/시간 유틸리티 함수
 * SQLite CURRENT_TIMESTAMP (UTC)를 한국 시간(KST)으로 변환
 */

/**
 * DB에서 가져온 UTC 시간 문자열을 한국 시간으로 변환
 * @param {string} dbTimestamp - DB에서 가져온 시간 문자열 (예: "2026-01-03 11:52:13")
 * @returns {string} 한국 시간 형식 문자열
 */
export function formatKST(dbTimestamp) {
  if (!dbTimestamp) return '-';

  // DB 시간 문자열에 'Z'를 붙여 UTC로 명시적 처리
  // "2026-01-03 11:52:13" -> "2026-01-03T11:52:13Z"
  const utcString = dbTimestamp.replace(' ', 'T') + 'Z';
  const date = new Date(utcString);

  // 유효하지 않은 날짜 처리
  if (isNaN(date.getTime())) {
    return dbTimestamp; // 원본 그대로 반환
  }

  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * DB에서 가져온 UTC 시간을 한국 날짜만 표시
 * @param {string} dbTimestamp - DB에서 가져온 시간 문자열
 * @returns {string} 한국 날짜 형식 문자열
 */
export function formatKSTDate(dbTimestamp) {
  if (!dbTimestamp) return '-';

  const utcString = dbTimestamp.replace(' ', 'T') + 'Z';
  const date = new Date(utcString);

  if (isNaN(date.getTime())) {
    return dbTimestamp;
  }

  return date.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * 상대적 시간 표시 (예: "5분 전", "2시간 전")
 * @param {string} dbTimestamp - DB에서 가져온 시간 문자열
 * @returns {string} 상대적 시간 문자열
 */
export function formatRelativeTime(dbTimestamp) {
  if (!dbTimestamp) return '-';

  const utcString = dbTimestamp.replace(' ', 'T') + 'Z';
  const date = new Date(utcString);

  if (isNaN(date.getTime())) {
    return dbTimestamp;
  }

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  return formatKSTDate(dbTimestamp);
}
