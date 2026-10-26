// Saytdagi voqealar haqida Oydinga xabar berish (masalan, yozuv saqlanganda u quvonadi yoki xavotirlanadi)

export const ROBOT_EVENT = "hisob:robot";

export type RobotEventDetail = {
  type: "entry";
  kind: "kirim" | "chiqim" | "otkazma";
  /** Mavjud yozuv tahrirlandi */
  editing: boolean;
  /** So'mda 1 mln va undan katta */
  big: boolean;
};

export function notifyRobot(detail: RobotEventDetail) {
  window.dispatchEvent(new CustomEvent<RobotEventDetail>(ROBOT_EVENT, { detail }));
}
