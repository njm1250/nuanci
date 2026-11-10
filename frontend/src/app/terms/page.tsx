import type { Metadata } from "next";
import Link from "next/link";
import { Contact, LegalPage } from "@/features/legal/legal-page";

export const metadata: Metadata = { title: "이용약관 · nuanci", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  const email = process.env.CONTACT_EMAIL;
  return (
    <LegalPage title="이용약관" updated="2026년 10월 24일">
      <section>
        <h2>1. 목적</h2>
        <p>이 약관은 nuanci(이하 &lsquo;서비스&rsquo;)를 이용하는 조건과 절차, 운영자와 이용자의 권리·의무를 정해요.</p>
      </section>

      <section>
        <h2>2. 서비스 내용</h2>
        <ul>
          <li>서비스는 상황 장면을 통해 영어 표현이 영어권에서 어떻게 들리는지 알아보는 학습 콘텐츠를 무료로 제공해요.</li>
          <li>로그인하지 않아도 이용할 수 있고, 구글로 로그인하면 기록을 여러 기기에서 이어 하고 아지트와 꾸미기 기능을 쓸 수 있어요.</li>
          <li>운영자는 서비스 내용을 바꾸거나 일부 기능을 중단할 수 있어요. 중요한 변경은 미리 알려요.</li>
        </ul>
      </section>

      <section>
        <h2>3. 계정</h2>
        <ul>
          <li>구글 계정으로 로그인하면 회원이 돼요. 만 14세 미만은 로그인할 수 없어요.</li>
          <li>이용자는 언제든 내 정보 화면에서 계정을 삭제할 수 있고, 삭제하면 계정에 저장된 기록이 지워져요.</li>
          <li>다른 사람의 계정을 쓰거나 서비스 운영을 방해하면 이용을 제한할 수 있어요.</li>
        </ul>
      </section>

      <section>
        <h2>4. 이용자의 의무</h2>
        <p>이용자는 다음 행위를 하면 안 돼요.</p>
        <ul>
          <li>서비스나 서버에 비정상적인 부하를 주거나, 허락 없이 데이터를 대량으로 수집하는 행위</li>
          <li>서비스의 보안을 우회하거나 다른 이용자의 정보를 얻으려는 행위</li>
          <li>법령이나 공공질서에 어긋나는 행위</li>
        </ul>
      </section>

      <section>
        <h2>5. 콘텐츠의 권리</h2>
        <p>장면, 문구, 캐릭터, 그림 등 서비스 안의 콘텐츠에 대한 권리는 운영자에게 있어요. 개인적인 학습 목적의 이용과 공유 기능을 통한 링크 공유는 자유롭게 할 수 있어요.</p>
      </section>

      <section>
        <h2>6. 책임의 한계</h2>
        <ul>
          <li>표현 해설은 일반적인 쓰임을 기준으로 해요. 지역, 세대, 상황에 따라 실제 쓰임이 다를 수 있어요.</li>
          <li>운영자는 천재지변, 서버 장애 등 운영자가 통제할 수 없는 사유로 서비스를 제공하지 못한 경우 책임을 지지 않아요.</li>
          <li>무료로 제공되는 서비스이므로, 운영자의 고의나 중대한 과실이 없는 한 서비스 이용으로 생긴 손해에 대해 책임을 지지 않아요.</li>
        </ul>
      </section>

      <section>
        <h2>7. 개인정보</h2>
        <p>
          개인정보는{" "}
          <Link href="/privacy" className="text-pink underline underline-offset-4">
            개인정보처리방침
          </Link>
          에 따라 처리해요.
        </p>
      </section>

      <section>
        <h2>8. 약관의 변경</h2>
        <p>약관이 바뀌면 시행 7일 전부터 이 페이지에 알려요. 이용자에게 불리한 변경은 30일 전부터 알려요. 바뀐 약관에 동의하지 않으면 이용을 멈추고 계정을 삭제할 수 있어요.</p>
      </section>

      <section>
        <h2>9. 준거법과 문의</h2>
        <p>
          이 약관은 대한민국 법을 따라요. 서비스 관련 문의는 <Contact email={email} />로 연락해 주세요.
        </p>
      </section>
    </LegalPage>
  );
}
