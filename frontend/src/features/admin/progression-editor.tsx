"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  rankAt,
  type ProgressionAdmin,
  type ProgressionRules,
} from "@/features/progression/types";
import {
  loadProgressionSettings,
  saveProgressionSettings,
} from "./settings-actions";
import { AdminPanel, adminTime } from "./ui";

const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const numberValue = (value: number) => (Number.isFinite(value) ? value : "");
const integer = (value: number, min = 1) =>
  Number.isInteger(value) && value >= min && value <= 10000;
const inputNumber = (value: string) => (value === "" ? NaN : Number(value));

function validation(rules: ProgressionRules, data: ProgressionAdmin) {
  if (
    !rules.ranks.length ||
    rules.ranks.length > 30 ||
    rules.ranks[0].min !== 0
  )
    return "첫 직급은 0개부터 시작해야 하며, 직급은 최대 30개까지 설정할 수 있습니다.";
  if (
    rules.ranks.some(
      (r) =>
        !integer(r.min, 0) ||
        !r.name.trim() ||
        r.name.trim().length > 20 ||
        /[\u0000-\u001f\u007f-\u009f]/.test(r.name),
    )
  )
    return "직급 이름은 1~20자, 장면 수는 0~10,000 사이의 정수로 입력해 주세요.";
  if (
    new Set(rules.ranks.map((r) => r.name.trim())).size !== rules.ranks.length
  )
    return "직급 이름은 중복될 수 없습니다.";
  if (rules.ranks.some((r, i) => i > 0 && r.min <= rules.ranks[i - 1].min))
    return "승급 기준은 중복 없이 작은 수부터 입력해 주세요.";
  if (data.milestoneItems.some((item) => !integer(rules.milestones[item.id])))
    return "장면 수 보상의 기준은 1~10,000 사이의 정수로 입력해 주세요.";
  if (
    rules.boxes.length > data.boxPoolSize ||
    rules.boxes.some(
      (count, i) => !integer(count) || (i > 0 && count <= rules.boxes[i - 1]),
    )
  )
    return `상자는 최대 ${data.boxPoolSize}개이며, 지급 시점은 1~10,000 사이의 정수를 작은 수부터 입력해 주세요.`;
  return null;
}

export function ProgressionEditor({ initial }: { initial: ProgressionAdmin }) {
  const [data, setData] = useState(initial);
  const [base, setBase] = useState(initial.settings);
  const [rules, setRules] = useState(initial.settings.rules);
  const [previewCount, setPreviewCount] = useState(5);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ error?: string; ok?: string }>({});
  const problem = validation(rules, data);
  const dirty = !equal(rules, base.rules);
  const preview = !problem ? rankAt(rules.ranks, previewCount) : null;
  const before = rankAt(base.rules.ranks, previewCount);
  const qualified = data.milestoneItems.filter(
    (item) => previewCount >= rules.milestones[item.id],
  );
  const changes: string[] = [];
  if (!equal(rules.ranks, base.rules.ranks))
    changes.push(
      `직급 이름·승급 기준 (${base.rules.ranks.length}단계 → ${rules.ranks.length}단계)`,
    );
  data.milestoneItems.forEach((item) => {
    if (rules.milestones[item.id] !== base.rules.milestones[item.id])
      changes.push(
        `${item.name}: ${base.rules.milestones[item.id]} → ${numberValue(rules.milestones[item.id]) || "미입력"}개`,
      );
  });
  if (!equal(rules.boxes, base.rules.boxes))
    changes.push(
      `깜짝 상자 지급: ${base.rules.boxes.join(", ") || "없음"} → ${rules.boxes.map((n) => numberValue(n) || "미입력").join(", ") || "없음"}`,
    );

  const edit = (next: ProgressionRules) => {
    setRules(next);
    setStatus({});
  };
  const save = () => {
    if (problem || !dirty) return;
    startTransition(async () => {
      setStatus({});
      try {
        const result = await saveProgressionSettings(base.version, rules);
        if (result.error) {
          setStatus({ error: result.error });
          return;
        }
        if (result.settings) {
          setBase(result.settings);
          setRules(result.settings.rules);
          setStatus({
            ok: "저장했습니다. 사원증은 페이지를 새로 열거나 새로고침하면 반영되며, 보상은 다음 동기화·장면 완료부터 새 기준을 사용합니다.",
          });
        }
      } catch {
        setStatus({
          error:
            "저장 결과를 확인하지 못했습니다. 최신 설정을 불러와 저장 여부를 확인해 주세요.",
        });
      }
    });
  };
  const reload = () =>
    startTransition(async () => {
      try {
        const latest = await loadProgressionSettings();
        setData(latest);
        setBase(latest.settings);
        setRules(latest.settings.rules);
        setStatus({});
      } catch {
        setStatus({
          error: "최신 설정을 불러오지 못했습니다. 편집 내용은 유지됩니다.",
        });
      }
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="adm-settings-meta">
        <span
          className={`adm-badge ${dirty ? "adm-badge-warning" : "adm-badge-success"}`}
        >
          {dirty ? "저장하지 않은 변경 있음" : "저장된 기준"}
        </span>
        <span className="adm-muted">
          {base.updatedAt
            ? `마지막 저장 ${adminTime(base.updatedAt)} · v${base.version}`
            : "기본 기준 사용 중"}
        </span>
        <div className="adm-actions">
          <button
            className="adm-btn adm-btn-sm"
            type="button"
            disabled={pending}
            onClick={reload}
          >
            편집 취소 · 최신 불러오기
          </button>
          <button
            className="adm-btn adm-btn-sm"
            type="button"
            disabled={pending}
            onClick={() => edit(structuredClone(data.defaults))}
          >
            기본값 불러오기
          </button>
        </div>
      </div>
      <p
        className="adm-notice adm-notice-informative"
        style={{ marginBottom: 20 }}
      >
        모든 장면 수 기준은 <strong>서로 다른 장면의 완료 수</strong>입니다.
        같은 장면을 반복해도 늘지 않습니다. 기본값 불러오기는 편집만 바꾸며,
        아래 저장 버튼을 눌러야 적용됩니다.
      </p>
      <div className="adm-settings-layout">
        <fieldset disabled={pending} className="adm-settings-fields">
          <AdminPanel
            title="사원증 직급"
            description="0개부터 시작해 위에서 아래로 승급합니다. 이름과 필요한 완료 장면 수를 바꾸거나 단계를 추가·삭제할 수 있습니다."
          >
            <div className="adm-table-scroll" style={{ maxHeight: 520 }}>
              <table className="adm-table adm-settings-table">
                <thead>
                  <tr>
                    <th>단계</th>
                    <th>직급 이름</th>
                    <th>완료 장면 수</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.ranks.map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <input
                          className="adm-input"
                          required
                          maxLength={20}
                          aria-label={`${i + 1}단계 직급 이름`}
                          value={r.name}
                          onChange={(e) =>
                            edit({
                              ...rules,
                              ranks: rules.ranks.map((x, index) =>
                                index === i
                                  ? { ...x, name: e.target.value }
                                  : x,
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        <label className="adm-settings-number">
                          <input
                            className="adm-input"
                            type="number"
                            min={0}
                            max={10000}
                            step={1}
                            required
                            readOnly={i === 0}
                            aria-label={`${i + 1}단계 필요 장면 수`}
                            value={numberValue(r.min)}
                            onChange={(e) =>
                              edit({
                                ...rules,
                                ranks: rules.ranks.map((x, index) =>
                                  index === i
                                    ? { ...x, min: inputNumber(e.target.value) }
                                    : x,
                                ),
                              })
                            }
                          />
                          개
                          {i === 0 && (
                            <span className="adm-muted">시작 직급</span>
                          )}
                        </label>
                      </td>
                      <td>
                        <button
                          className="adm-btn adm-btn-sm"
                          type="button"
                          disabled={i === 0}
                          aria-label={`${r.name || `${i + 1}단계`} 직급 삭제`}
                          onClick={() =>
                            edit({
                              ...rules,
                              ranks: rules.ranks.filter(
                                (_, index) => index !== i,
                              ),
                            })
                          }
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="adm-panel-body">
              <button
                className="adm-btn"
                type="button"
                disabled={rules.ranks.length >= 30}
                onClick={() =>
                  edit({
                    ...rules,
                    ranks: [
                      ...rules.ranks,
                      {
                        min: Math.min(
                          10000,
                          (rules.ranks.at(-1)?.min || 0) + 5,
                        ),
                        name: "",
                      },
                    ],
                  })
                }
              >
                ＋ 직급 추가
              </button>
              <p className="adm-muted" style={{ marginTop: 12 }}>
                직급은 새 기준으로 다시 계산됩니다. 기준을 높이거나 단계를
                삭제하면 기존 유저의 직급이 내려갈 수 있습니다.
              </p>
            </div>
          </AdminPanel>
          <AdminPanel
            title="장면 수 달성 보상"
            description="보상별 지급 기준을 조절합니다. 여러 보상을 같은 장면 수에 지급할 수도 있습니다."
          >
            <div className="adm-table-scroll" style={{ maxHeight: 460 }}>
              <table className="adm-table adm-settings-table">
                <thead>
                  <tr>
                    <th>물건</th>
                    <th>지급에 필요한 완료 장면 수</th>
                    <th>현재 저장값</th>
                  </tr>
                </thead>
                <tbody>
                  {data.milestoneItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <span className="adm-secondary">{item.id}</span>
                      </td>
                      <td>
                        <label className="adm-settings-number">
                          <input
                            className="adm-input"
                            type="number"
                            required
                            min={1}
                            max={10000}
                            step={1}
                            aria-label={`${item.name} 지급 장면 수`}
                            value={numberValue(rules.milestones[item.id])}
                            onChange={(e) =>
                              edit({
                                ...rules,
                                milestones: {
                                  ...rules.milestones,
                                  [item.id]: inputNumber(e.target.value),
                                },
                              })
                            }
                          />
                          개
                        </label>
                      </td>
                      <td className="adm-muted">
                        {base.rules.milestones[item.id]}개
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="adm-muted adm-panel-body">
              특정 장면 기념품·묶음 완주·친구 공유 보상의 조건은 이 화면에서
              변경하지 않습니다.
            </p>
          </AdminPanel>
          <AdminPanel
            title="깜짝 상자 지급 시점"
            description={`각 완료 장면 수에 상자 하나를 지급합니다. 없는 물건만 나오며 최대 ${data.boxPoolSize}회까지 설정할 수 있습니다.`}
          >
            <div className="adm-table-scroll" style={{ maxHeight: 360 }}>
              <table className="adm-table adm-settings-table">
                <thead>
                  <tr>
                    <th>상자</th>
                    <th>완료 장면 수</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.boxes.map((count, i) => (
                    <tr key={i}>
                      <td>{i + 1}번째</td>
                      <td>
                        <label className="adm-settings-number">
                          <input
                            className="adm-input"
                            type="number"
                            required
                            min={1}
                            max={10000}
                            step={1}
                            aria-label={`${i + 1}번째 상자 지급 장면 수`}
                            value={numberValue(count)}
                            onChange={(e) =>
                              edit({
                                ...rules,
                                boxes: rules.boxes.map((n, index) =>
                                  index === i ? inputNumber(e.target.value) : n,
                                ),
                              })
                            }
                          />
                          개
                        </label>
                      </td>
                      <td>
                        <button
                          className="adm-btn adm-btn-sm"
                          type="button"
                          aria-label={`${i + 1}번째 상자 삭제`}
                          onClick={() =>
                            edit({
                              ...rules,
                              boxes: rules.boxes.filter(
                                (_, index) => index !== i,
                              ),
                            })
                          }
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="adm-panel-body">
              {!rules.boxes.length && (
                <p
                  className="adm-notice adm-notice-warning"
                  style={{ marginBottom: 12 }}
                >
                  지급 시점이 없습니다. 이대로 저장하면 앞으로 새 상자를
                  지급하지 않습니다.
                </p>
              )}
              <button
                className="adm-btn"
                type="button"
                disabled={rules.boxes.length >= data.boxPoolSize}
                onClick={() =>
                  edit({
                    ...rules,
                    boxes: [
                      ...rules.boxes,
                      Math.min(10000, (rules.boxes.at(-1) || 0) + 10),
                    ],
                  })
                }
              >
                ＋ 상자 지급 시점 추가
              </button>
              <p className="adm-muted" style={{ marginTop: 12 }}>
                이미 지급한 상자는 차감하지 않습니다. 예를 들어 2개를 받은
                유저는 변경 후 3번째 기준부터 다음 상자를 받습니다.
              </p>
            </div>
          </AdminPanel>
        </fieldset>
        <aside className="adm-settings-preview">
          <AdminPanel
            title="적용 미리보기"
            description="저장하지 않고 새 기준을 시험해 보세요."
          >
            <div className="adm-panel-body">
              <label htmlFor="progression-preview-count" className="adm-muted">
                유저가 완료한 서로 다른 장면
              </label>
              <label className="adm-settings-number" style={{ marginTop: 10 }}>
                <input
                  id="progression-preview-count"
                  className="adm-input"
                  type="number"
                  min={0}
                  max={10000}
                  step={1}
                  value={previewCount}
                  onChange={(e) =>
                    setPreviewCount(
                      Math.max(
                        0,
                        Math.min(
                          10000,
                          Math.floor(Number(e.target.value) || 0),
                        ),
                      ),
                    )
                  }
                />
                개
              </label>
              <div className="adm-rank-preview">
                <span>저장된 기준</span>
                <strong>{before.current.name}</strong>
              </div>
              <div className="adm-rank-preview adm-rank-preview-new">
                <span>편집한 기준</span>
                <strong>{preview?.current.name || "입력 확인 필요"}</strong>
                {preview?.next && (
                  <p>
                    {preview.next.min - previewCount}개 더 완료하면{" "}
                    {preview.next.name}
                  </p>
                )}
                {preview && !preview.next && <p>가장 높은 직급입니다.</p>}
              </div>
              {!problem && (
                <>
                  <p className="adm-muted">
                    장면 수 보상 조건 충족 {qualified.length}개
                  </p>
                  <div
                    className="adm-mix-tags"
                    style={{ margin: "8px 0 14px" }}
                  >
                    {qualified.map((item) => (
                      <span key={item.id}>{item.name}</span>
                    ))}
                    {!qualified.length && <span>없음</span>}
                  </div>
                  <p>
                    상자 지급 기준{" "}
                    {rules.boxes.filter((n) => n <= previewCount).length}회 충족
                  </p>
                  <p className="adm-muted" style={{ marginTop: 10 }}>
                    기존에 가진 물건과 무관한 조건 미리보기입니다. 실제 보상은
                    없는 물건만 지급합니다.
                  </p>
                </>
              )}
            </div>
          </AdminPanel>
          <AdminPanel
            title="저장할 변경"
            description={
              changes.length
                ? `${changes.length}개 항목`
                : "변경된 항목이 없습니다."
            }
          >
            <div className="adm-panel-body">
              <div className="adm-settings-changes">
                {changes.map((change) => (
                  <p key={change}>{change}</p>
                ))}
              </div>
              <p className="adm-muted" style={{ marginTop: 10 }}>
                이미 받은 물건과 획득 당시 장면 수 기준은 유지합니다. 조건을
                낮추면 다음 동기화 때 추가 보상을 받을 수 있습니다.
              </p>
            </div>
          </AdminPanel>
          <Link className="adm-btn" href="/me" target="_blank" rel="noreferrer">
            내 정보에서 사원증 보기 ↗
          </Link>
        </aside>
      </div>
      <div className="adm-settings-save">
        <div aria-live="polite">
          {problem ? (
            <p className="adm-settings-error">{problem}</p>
          ) : status.error ? (
            <p className="adm-settings-error" role="alert">
              {status.error}
            </p>
          ) : status.ok ? (
            <p className="adm-settings-success">{status.ok}</p>
          ) : (
            <p className="adm-muted">
              {dirty
                ? "변경 내용을 검토한 뒤 저장하세요."
                : "현재 저장된 기준과 같습니다."}
            </p>
          )}
        </div>
        <div className="adm-actions">
          <button
            className="adm-btn"
            type="button"
            disabled={pending || !dirty}
            onClick={() => {
              setRules(base.rules);
              setStatus({});
            }}
          >
            변경 되돌리기
          </button>
          <button
            className="adm-btn adm-btn-primary"
            type="submit"
            disabled={pending || !!problem || !dirty}
          >
            {pending ? "처리 중…" : "설정 저장 · 서비스에 적용"}
          </button>
        </div>
      </div>
    </form>
  );
}
