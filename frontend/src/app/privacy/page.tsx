import type { Metadata } from "next";
import { InquiryButton } from "@/features/inquiry/inquiry-form";
import { Contact, LegalPage } from "@/features/legal/legal-page";

export const metadata: Metadata = { title: "개인정보처리방침 · nuanci", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  const email = process.env.CONTACT_EMAIL;
  return (
    <LegalPage title="개인정보처리방침" updated="2026년 10월 25일">
      <p>
        nuanci(이하 &lsquo;서비스&rsquo;)는 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 관련 고충을 빠르게 처리하기 위해 다음과 같이 개인정보처리방침을
        둡니다.
      </p>

      <section>
        <h2>1. 처리하는 개인정보와 목적</h2>
        <table>
          <thead>
            <tr>
              <th>구분</th>
              <th>항목</th>
              <th>목적</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>로그인하지 않은 이용자</td>
              <td>무작위로 만든 방문자 식별값, 장면 이용 기록(본 장면, 고른 선택지, 완료·공유 여부, 들어온 경로)</td>
              <td>서비스 개선을 위한 이용 통계</td>
            </tr>
            <tr>
              <td>구글로 로그인한 이용자</td>
              <td>구글 계정 식별값, 이메일, 이름, 프로필 사진 주소, 해 본 장면, 주인공 꾸미기 설정, 로그인 전 이 기기의 방문자 식별값</td>
              <td>회원 식별, 여러 기기에서 기록 이어 하기, 아지트·꾸미기 제공, 이용 통계</td>
            </tr>
            <tr>
              <td>문의한 이용자</td>
              <td>문의 내용, 문의한 화면 주소, 브라우저 정보, 답장 받을 이메일(남긴 경우), 로그인한 경우 계정</td>
              <td>문의 답변과 오류 해결</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3">서비스 이용 과정에서 접속 IP, 브라우저 정보, 접속 시각 같은 접속 기록이 서버와 호스팅 업체의 로그에 자동으로 남을 수 있어요. 이 기록은 보안과 오류 대응에만 써요.</p>
      </section>

      <section>
        <h2>2. 보유 기간과 파기</h2>
        <ul>
          <li>회원 정보(계정 정보, 해 본 장면, 꾸미기 설정)는 회원이 계정을 삭제하면 바로 파기해요.</li>
          <li>장면 이용 기록은 통계에 필요한 동안 보관하고, 계정을 삭제하면 계정과의 연결을 끊어 누구의 기록인지 알 수 없게 해요.</li>
          <li>로그인 세션은 최대 90일 뒤 만료되고, 로그아웃하면 바로 지워요.</li>
          <li>문의 내용과 남긴 이메일은 답변을 마친 뒤 1년 안에 지워요. 계정을 삭제하면 문의와 계정의 연결은 바로 끊어요.</li>
          <li>파기할 때는 다시 살릴 수 없는 방법으로 DB에서 지워요.</li>
        </ul>
      </section>

      <section>
        <h2>3. 이용자 기기에 저장하는 정보 (쿠키·로컬 저장소)</h2>
        <ul>
          <li>
            <strong>로컬 저장소:</strong> 방문자 식별값, 해 본 장면, 처음 방문한 시점, 효과음 설정, 주인공 꾸미기 설정을 이 브라우저에 저장해요. 로그인하지 않아도 진행 상황을 이어 하기 위해서예요.
          </li>
          <li>
            <strong>쿠키:</strong> 로그인을 유지하는 세션 쿠키와, 구글 로그인 중 위조를 막는 10분짜리 확인 쿠키를 써요. 광고나 추적용 쿠키는 쓰지 않아요.
          </li>
          <li>브라우저 설정에서 사이트 데이터를 지우면 이 정보도 지워지고, 로그인하지 않았다면 진행 상황이 사라져요.</li>
        </ul>
      </section>

      <section>
        <h2>4. 처리 위탁과 국외 이전</h2>
        <p>서비스 운영을 위해 아래 업체에 개인정보 처리를 맡겨요. 일부는 해외에서 처리돼요.</p>
        <table>
          <thead>
            <tr>
              <th>업체</th>
              <th>맡기는 일</th>
              <th>위치</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Amazon Web Services (Lightsail)</td>
              <td>서버와 데이터베이스 운영</td>
              <td>대한민국 (서울 리전)</td>
            </tr>
            <tr>
              <td>Vercel Inc.</td>
              <td>웹사이트 호스팅, 요청 전달</td>
              <td>미국 등 (요청은 서울 리전에서 처리)</td>
            </tr>
            <tr>
              <td>Google LLC</td>
              <td>구글 로그인 인증</td>
              <td>미국</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3">
          국외로 이전되는 항목은 접속 기록과 서비스 이용 중 전송되는 정보이며, 이용자가 사이트에 접속할 때 네트워크를 통해 전송돼요. 국외 이전을 원하지 않으면 서비스 이용을 멈추거나 계정을 삭제할 수
          있어요.
        </p>
      </section>

      <section>
        <h2>5. 제3자 제공</h2>
        <p>이용자의 개인정보를 제3자에게 제공하지 않아요. 다만 법령에 따라 수사기관 등이 정당한 절차로 요구하는 경우는 예외예요.</p>
      </section>

      <section>
        <h2>6. 이용자의 권리</h2>
        <ul>
          <li>내 정보 화면에서 언제든 로그아웃하거나 계정을 삭제할 수 있어요. 계정을 삭제하면 회원 정보가 바로 파기돼요.</li>
          <li>개인정보 열람, 정정, 삭제, 처리 정지를 원하면 아래 연락처로 요청해 주세요. 지체 없이 처리할게요.</li>
          <li>만 14세 미만은 구글 로그인을 이용할 수 없어요.</li>
        </ul>
      </section>

      <section>
        <h2>7. 안전성 확보 조치</h2>
        <ul>
          <li>모든 통신은 HTTPS로 암호화해요.</li>
          <li>로그인 세션 토큰은 원문 대신 해시값만 저장해요.</li>
          <li>관리자만 데이터에 접근할 수 있게 인증하고, 접근 권한을 최소한으로 둬요.</li>
        </ul>
      </section>

      <section>
        <h2>8. 개인정보 보호책임자와 문의</h2>
        <p>
          개인정보 관련 문의, 불만, 피해 구제는 nuanci 운영자에게 연락해 주세요: <Contact email={email} />
        </p>
        <InquiryButton className="mt-3 inline-flex min-h-11 items-center border-2 border-current px-3 font-semibold">화면에서 바로 문의하기 ›</InquiryButton>
        <p className="mt-2">
          이 밖에 개인정보 침해에 대한 신고나 상담은 개인정보침해신고센터(국번 없이 118, privacy.kisa.or.kr), 개인정보분쟁조정위원회(1833-6972, www.kopico.go.kr)에 문의할 수 있어요.
        </p>
      </section>

      <section>
        <h2>9. 방침의 변경</h2>
        <p>이 방침이 바뀌면 시행 7일 전부터 이 페이지에 알려요. 이용자 권리에 중요한 변경은 30일 전부터 알려요.</p>
      </section>
    </LegalPage>
  );
}
