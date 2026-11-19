import { randomInt } from 'node:crypto'

/**
 * 透传帧的帧头.
 */
const FRAME_HEAD = 0xaa

/**
 * 透传帧中表示空调的设备类型码.
 */
const DEVICE_TYPE_AIR_CONDITIONER = 0xac

/**
 * 帧头部分 (帧头到报文类型) 的字节数, 消息体从此下标开始.
 */
const FRAME_HEADER_LENGTH = 10

/**
 * 帧中长度字节的下标; 长度字节的值等于整帧字节数减 1.
 */
const LENGTH_INDEX = 1

/**
 * 帧中设备类型码的下标.
 */
const DEVICE_TYPE_INDEX = 2

/**
 * 帧中报文类型的下标.
 */
const MESSAGE_TYPE_INDEX = 9

/**
 * 消息体随机字节的取值下限 (含), 与 v96 版 Lua math.random(1, 254) 一致.
 */
const RANDOM_BYTE_MIN = 1

/**
 * 消息体随机字节的取值上限 (含).
 */
const RANDOM_BYTE_MAX = 254

/**
 * 一个字节的掩码.
 */
const BYTE_MASK = 0xff

/**
 * 透传帧的报文类型.
 */
export const AC_MESSAGE_TYPES = {
  /**
   * 控制.
   */
  CONTROL: 0x02,
  /**
   * 查询.
   */
  QUERY: 0x03
} as const

/**
 * crc8_854 查表, 取自 v96 版 Lua 的 crc8_854_table.
 */
const CRC8_854_TABLE: readonly number[] = [
  0, 94, 188, 226, 97, 63, 221, 131, 194, 156, 126, 32, 163, 253, 31, 65, 157, 195, 33, 127, 252,
  162, 64, 30, 95, 1, 227, 189, 62, 96, 130, 220, 35, 125, 159, 193, 66, 28, 254, 160, 225, 191, 93,
  3, 128, 222, 60, 98, 190, 224, 2, 92, 223, 129, 99, 61, 124, 34, 192, 158, 29, 67, 161, 255, 70,
  24, 250, 164, 39, 121, 155, 197, 132, 218, 56, 102, 229, 187, 89, 7, 219, 133, 103, 57, 186, 228,
  6, 88, 25, 71, 165, 251, 120, 38, 196, 154, 101, 59, 217, 135, 4, 90, 184, 230, 167, 249, 27, 69,
  198, 152, 122, 36, 248, 166, 68, 26, 153, 199, 37, 123, 58, 100, 134, 216, 91, 5, 231, 185, 140,
  210, 48, 110, 237, 179, 81, 15, 78, 16, 242, 172, 47, 113, 147, 205, 17, 79, 173, 243, 112, 46,
  204, 146, 211, 141, 111, 49, 178, 236, 14, 80, 175, 241, 19, 77, 206, 144, 114, 44, 109, 51, 209,
  143, 12, 82, 176, 238, 50, 108, 142, 208, 83, 13, 239, 177, 240, 174, 76, 18, 145, 207, 45, 115,
  202, 148, 118, 40, 171, 245, 23, 73, 8, 86, 180, 234, 105, 55, 213, 139, 87, 9, 235, 181, 54, 104,
  138, 212, 149, 203, 41, 119, 244, 170, 72, 22, 233, 183, 85, 11, 136, 214, 52, 106, 43, 117, 151,
  201, 74, 20, 246, 168, 116, 42, 200, 150, 21, 75, 169, 247, 182, 232, 10, 84, 215, 137, 107, 53
]

/**
 * 解析后的透传帧.
 */
export interface AcFrame {
  /**
   * 报文类型.
   */
  readonly messageType: number
  /**
   * 消息体: 从命令字起, 到 crc8 字节为止 (含).
   */
  readonly body: readonly number[]
}

/**
 * 透传帧不符合协议时抛出的错误.
 */
export class AcFrameError extends Error {
  /**
   * 创建帧错误.
   * @param message 错误描述.
   */
  constructor(message: string) {
    super(message)
    this.name = 'AcFrameError'
  }
}

/**
 * 计算 crc8_854 校验, 与 v96 版 Lua crc8_854 一致.
 * @param bytes 参与校验的字节.
 * @returns 校验字节.
 */
function computeCrc8854(bytes: readonly number[]): number {
  return bytes.reduce((crc, byte) => CRC8_854_TABLE[(crc ^ byte) & BYTE_MASK], 0)
}

/**
 * 计算整帧和校验, 与 v96 版 Lua makeSum 一致: 0x100 减去字节和的低 8 位.
 * @param bytes 参与校验的字节 (长度字节到消息体末字节).
 * @returns 校验字节.
 */
function computeSum(bytes: readonly number[]): number {
  const total = bytes.reduce((sum, byte) => (sum + byte) & BYTE_MASK, 0)
  return (BYTE_MASK - total + 1) & BYTE_MASK
}

/**
 * 组装一帧: 在负载后追加随机字节与 crc8_854 得到消息体, 再加上帧头与和校验.
 * @param messageType 报文类型.
 * @param payload 消息体中随机字节之前的部分 (从命令字起).
 * @returns 完整帧字节.
 */
export function buildAcFrame(messageType: number, payload: readonly number[]): readonly number[] {
  const bodyWithoutCrc = [...payload, randomInt(RANDOM_BYTE_MIN, RANDOM_BYTE_MAX + 1)]
  const body = [...bodyWithoutCrc, computeCrc8854(bodyWithoutCrc)]
  const header = new Array<number>(FRAME_HEADER_LENGTH).fill(0)
  header[0] = FRAME_HEAD
  header[LENGTH_INDEX] = FRAME_HEADER_LENGTH + body.length
  header[DEVICE_TYPE_INDEX] = DEVICE_TYPE_AIR_CONDITIONER
  header[MESSAGE_TYPE_INDEX] = messageType
  const withoutSum = [...header, ...body]
  return [...withoutSum, computeSum(withoutSum.slice(LENGTH_INDEX))]
}

/**
 * 解析设备回帧并校验帧头, 长度, 设备类型与和校验.
 * @param frame 完整帧字节.
 * @returns 报文类型与消息体.
 * @throws AcFrameError 当帧不符合协议时.
 */
export function parseAcFrame(frame: readonly number[]): AcFrame {
  if (frame.length <= FRAME_HEADER_LENGTH || frame[0] !== FRAME_HEAD) {
    throw new AcFrameError('ac: 回帧帧头无效')
  }
  if (frame[LENGTH_INDEX] !== frame.length - 1) {
    throw new AcFrameError('ac: 回帧长度与长度字节不符')
  }
  if (frame[DEVICE_TYPE_INDEX] !== DEVICE_TYPE_AIR_CONDITIONER) {
    throw new AcFrameError('ac: 回帧不是空调设备帧')
  }
  const sumIndex = frame.length - 1
  if (computeSum(frame.slice(LENGTH_INDEX, sumIndex)) !== frame[sumIndex]) {
    throw new AcFrameError('ac: 回帧和校验不符')
  }
  return {
    messageType: frame[MESSAGE_TYPE_INDEX],
    body: frame.slice(FRAME_HEADER_LENGTH, sumIndex)
  }
}
