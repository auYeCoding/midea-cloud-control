/**
 * 解析后的 JSON 对象.
 */
export type JsonRecord = Readonly<Record<string, unknown>>

/**
 * 判断值是否为 JSON 对象 (非 null, 非数组).
 * @param value 待判断的值.
 * @returns 是对象时返回 true.
 */
export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 读取对象中的字符串字段.
 * @param record 来源对象.
 * @param key 字段名.
 * @returns 字段为字符串时返回其值, 否则返回 undefined.
 */
export function readString(record: JsonRecord, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

/**
 * 读取对象中的数值字段.
 * @param record 来源对象.
 * @param key 字段名.
 * @returns 字段为有限数值时返回其值, 否则返回 undefined.
 */
export function readNumber(record: JsonRecord, key: string): number | undefined {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * 读取对象中的子对象字段.
 * @param record 来源对象.
 * @param key 字段名.
 * @returns 字段为对象时返回其值, 否则返回 undefined.
 */
export function readRecord(record: JsonRecord, key: string): JsonRecord | undefined {
  const value = record[key]
  return isJsonRecord(value) ? value : undefined
}

/**
 * 读取对象中的对象数组字段, 丢弃其中不是对象的元素.
 * @param record 来源对象.
 * @param key 字段名.
 * @returns 对象数组; 字段不是数组时返回空数组.
 */
export function readRecordArray(record: JsonRecord, key: string): readonly JsonRecord[] {
  const value = record[key]
  return Array.isArray(value) ? value.filter(isJsonRecord) : []
}
