"use client";

import { useContext, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSessionToken } from "@/lib/auth/session-store";
import { formatAppDate, formatAppNumber } from "@/lib/i18n";
import { AppContext } from "@/providers/app-provider";
import {
  claimRewardAdSession,
  createRewardAdSession,
  fetchMissionBoard,
  type MissionBoardItem,
  type MissionBoardResponse,
} from "./api";
import { ProfilePanel, ProfileShell } from "./profile-shell";

function statusLabel(status: string) {
  if (status === "CLAIMED") return "Đã nhận";
  if (status === "COMPLETED") return "Hoàn thành";
  if (status === "FAILED") return "Thất bại";
  return "Đang làm";
}

function isCompletedStatus(status: string) {
  return status === "COMPLETED" || status === "CLAIMED";
}

function isRewardAdMission(mission: MissionBoardItem) {
  return mission.action === "REWARD_AD";
}

function getMissionProgressLabel(mission: MissionBoardItem) {
  if (mission.targetProgress && mission.targetProgress > 1) {
    return `${Math.min(mission.progress, mission.targetProgress)}/${mission.targetProgress} hôm nay`;
  }

  return statusLabel(mission.status);
}

export function ProfileMissionsPage() {
  const { loaded, locale } = useContext(AppContext);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; data: MissionBoardResponse }
    | { status: "error"; message: string }
  >({ status: "loading" });
  const [rewardAdState, setRewardAdState] = useState<{
    sessionId: string | null;
    claimableAt: string | null;
    secondsRemaining: number;
    busy: boolean;
    message: string | null;
  }>({
    sessionId: null,
    claimableAt: null,
    secondsRemaining: 0,
    busy: false,
    message: null,
  });

  async function loadMissionBoard(signal?: AbortSignal) {
    const token = getSessionToken() ?? undefined;
    const result = await fetchMissionBoard(token, signal);
    if (signal?.aborted) {
      return;
    }

    if (!result.ok) {
      setState({
        status: "error",
        message: result.error.message || "Không thể tải bảng nhiệm vụ.",
      });
      return;
    }

    setState({ status: "ready", data: result.data });
  }

  useEffect(() => {
    if (!loaded) {
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    void loadMissionBoard(controller.signal);

    return () => controller.abort();
  }, [loaded]);

  useEffect(() => {
    if (!rewardAdState.claimableAt) {
      return;
    }

    function updateCountdown() {
      const claimAt = new Date(rewardAdState.claimableAt as string).getTime();
      const secondsRemaining = Math.max(
        0,
        Math.ceil((claimAt - Date.now()) / 1000),
      );
      setRewardAdState((current) => ({
        ...current,
        secondsRemaining,
      }));
    }

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [rewardAdState.claimableAt]);

  async function onStartRewardAdMission() {
    const token = getSessionToken() ?? undefined;
    if (!token) {
      setRewardAdState((current) => ({
        ...current,
        message: "Vui lòng đăng nhập để làm nhiệm vụ này.",
      }));
      return;
    }

    setRewardAdState((current) => ({
      ...current,
      busy: true,
      message: null,
    }));

    const result = await createRewardAdSession(token);
    if (!result.ok) {
      setRewardAdState((current) => ({
        ...current,
        busy: false,
        message: result.error.message || "Không thể tạo phiên nhiệm vụ.",
      }));
      return;
    }

    const popup = window.open(
      result.data.smartlinkUrl,
      "_blank",
      "noopener,noreferrer",
    );
    const claimAt = new Date(result.data.claimableAt).getTime();

    setRewardAdState({
      sessionId: result.data.sessionId,
      claimableAt: result.data.claimableAt,
      secondsRemaining: Math.max(0, Math.ceil((claimAt - Date.now()) / 1000)),
      busy: false,
      message: popup
        ? `Đã mở nội dung tài trợ. Bạn có thể nhận điểm sau ${result.data.viewSeconds} giây.`
        : "Trình duyệt đã chặn cửa sổ mới. Hãy cho phép popup rồi thử lại.",
    });
  }

  async function onClaimRewardAdMission() {
    const token = getSessionToken() ?? undefined;
    if (!token || !rewardAdState.sessionId) {
      setRewardAdState((current) => ({
        ...current,
        message: "Không tìm thấy phiên nhiệm vụ hợp lệ.",
      }));
      return;
    }

    setRewardAdState((current) => ({
      ...current,
      busy: true,
      message: null,
    }));

    const result = await claimRewardAdSession(rewardAdState.sessionId, token);
    if (!result.ok) {
      setRewardAdState((current) => ({
        ...current,
        busy: false,
        message: result.error.message || "Chưa thể nhận điểm.",
      }));
      return;
    }

    setRewardAdState({
      sessionId: null,
      claimableAt: null,
      secondsRemaining: 0,
      busy: false,
      message: `Đã nhận +${formatAppNumber(result.data.pointsAwarded, locale)} điểm thưởng.`,
    });
    await loadMissionBoard();
  }

  const data = state.status === "ready" ? state.data : null;
  const todayEarned = data?.todayEarned ?? 0;
  const dailyLimit = data?.dailyLimit ?? 150;
  const pointBalance = data?.pointBalance ?? 0;
  const expiryMonths = data?.rewardPointExpiresAfterMonths ?? 1;
  const rewardAdClaimReady =
    Boolean(rewardAdState.sessionId) && rewardAdState.secondsRemaining <= 0;

  return (
    <ProfileShell active="missions">
      <ProfilePanel title="BẢNG NHIỆM VỤ">
        <div className="profile-point-summary">
          <strong>{formatAppNumber(pointBalance, locale)}</strong>
          <span>điểm thưởng hiện có</span>
          <small>
            Hôm nay: {formatAppNumber(todayEarned, locale)} /{" "}
            {formatAppNumber(dailyLimit, locale)}
          </small>
        </div>
        <p className="profile-panel-intro">
          Điểm thưởng tách riêng với Kim Tệ, có thể dùng để mua combo hoặc
          chương lẻ. Điểm thưởng sẽ hết hạn sau {expiryMonths} tháng kể từ ngày
          nhận.
        </p>

        {state.status === "loading" ? (
          <p className="profile-empty-state">Đang tải nhiệm vụ...</p>
        ) : state.status === "error" ? (
          <p className="profile-error-state">{state.message}</p>
        ) : data && data.items.length === 0 ? (
          <p className="profile-empty-state">Chưa có nhiệm vụ đang mở.</p>
        ) : data ? (
          <>
            <Table className="profile-data-table">
              <TableHeader>
                <TableRow>
                  <TableHead>STT</TableHead>
                  <TableHead>Nhiệm vụ</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="text-center">Phần thưởng</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead>Hết hạn</TableHead>
                  <TableHead className="text-center">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((mission, index) => {
                  const rewardMission = isRewardAdMission(mission);
                  const rewardMissionDone =
                    rewardMission &&
                    mission.targetProgress !== undefined &&
                    mission.progress >= mission.targetProgress;

                  return (
                    <TableRow key={mission.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-semibold">{mission.title}</TableCell>
                      <TableCell>{mission.description ?? "-"}</TableCell>
                      <TableCell className="text-center font-semibold text-emerald-600">
                        +{formatAppNumber(mission.points, locale)} điểm thưởng
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className="profile-mission-status"
                          data-completed={
                            isCompletedStatus(mission.status) ? "true" : "false"
                          }
                        >
                          {isCompletedStatus(mission.status) ? (
                            <span aria-hidden="true">✓</span>
                          ) : null}
                          {getMissionProgressLabel(mission)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {mission.endsAt ? formatAppDate(mission.endsAt, locale) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {rewardMission ? (
                          <button
                            className="profile-mission-action"
                            type="button"
                            disabled={
                              rewardAdState.busy ||
                              rewardMissionDone ||
                              (Boolean(rewardAdState.sessionId) && !rewardAdClaimReady)
                            }
                            onClick={() =>
                              rewardAdClaimReady
                                ? void onClaimRewardAdMission()
                                : void onStartRewardAdMission()
                            }
                          >
                            {rewardMissionDone
                              ? "Đã đủ hôm nay"
                              : rewardAdState.busy
                                ? "Đang xử lý..."
                                : rewardAdState.sessionId && !rewardAdClaimReady
                                  ? `Nhận sau ${rewardAdState.secondsRemaining}s`
                                  : rewardAdClaimReady
                                    ? "Nhận điểm"
                                    : "Xem nội dung tài trợ"}
                          </button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {rewardAdState.message ? (
              <p className="profile-mission-message">{rewardAdState.message}</p>
            ) : null}
          </>
        ) : null}
      </ProfilePanel>
    </ProfileShell>
  );
}
