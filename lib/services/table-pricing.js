/**
 * Table Duration & Custom Pricing Tiers Helper
 *
 * Uses ultra-compact encoding inside `Table.description` (`~PT~:0.5=100,1=200,1.5=300,2=400,3=600`)
 * so that custom duration & price packages always fit cleanly inside MySQL VARCHAR(191)
 * without requiring any schema migration.
 */

const COMPACT_PREFIX = '~PT~:'
const LEGACY_PREFIX = '__PRICING_TIERS__:'
const MAX_VARCHAR_LEN = 190

export function getDefaultPricingTiers(hourlyRate = 200) {
  const rate = Number(hourlyRate || 200)
  return [
    { durationHours: 0.5, price: Math.round(rate * 0.5), label: '0.5 Hour' },
    { durationHours: 1, price: Math.round(rate * 1), label: '1 Hour' },
    { durationHours: 1.5, price: Math.round(rate * 1.5), label: '1.5 Hours' },
    { durationHours: 2, price: Math.round(rate * 2), label: '2 Hours' },
    { durationHours: 3, price: Math.round(rate * 3), label: '3 Hours' },
  ]
}

export function normalizePricingTiers(tiers, fallbackHourlyRate = 200) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return getDefaultPricingTiers(fallbackHourlyRate)
  }

  const cleaned = []
  const seenDurations = new Set()

  for (const item of tiers) {
    const dur = Number(item?.durationHours ?? item?.duration ?? 0)
    const price = Number(item?.price ?? item?.amount ?? NaN)
    if (!dur || dur <= 0 || Number.isNaN(price) || price < 0) continue
    const normDur = Number(dur.toFixed(2))
    if (seenDurations.has(normDur)) continue
    seenDurations.add(normDur)

    cleaned.push({
      durationHours: normDur,
      price: Number(price.toFixed(2)),
      label:
        item?.label ||
        (normDur === 1 ? '1 Hour' : `${normDur} Hours`),
    })
  }

  cleaned.sort((a, b) => a.durationHours - b.durationHours)

  if (cleaned.length === 0) {
    return getDefaultPricingTiers(fallbackHourlyRate)
  }

  return cleaned
}

function parseCompactTiersString(compactStr, fallbackHourlyRate = 200) {
  // e.g. "0.5=100,1=200,1.5=280,2=350,3=500"
  const pairs = String(compactStr || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const parsedItems = []
  for (const pair of pairs) {
    const [durStr, priceStr] = pair.split('=')
    const durationHours = Number(durStr)
    const price = Number(priceStr)
    if (!Number.isNaN(durationHours) && durationHours > 0 && !Number.isNaN(price) && price >= 0) {
      parsedItems.push({ durationHours, price })
    }
  }

  return normalizePricingTiers(parsedItems, fallbackHourlyRate)
}

export function parseTablePricing(table) {
  const hourlyRate = Number(table?.hourlyRate || 200)
  const rawDesc = String(table?.description || '')

  // 1. Check ultra-compact format: "~PT~:0.5=100,1=200,1.5=300..."
  if (rawDesc.includes(COMPACT_PREFIX)) {
    const [textPart, compactPart] = rawDesc.split(COMPACT_PREFIX)
    const pricingTiers = parseCompactTiersString(compactPart, hourlyRate)
    const oneHourTier = pricingTiers.find((t) => Number(t.durationHours) === 1)
    return {
      cleanDescription: textPart.trim(),
      pricingTiers,
      effectiveHourlyRate: oneHourTier ? Number(oneHourTier.price) : hourlyRate,
    }
  }

  // 2. Check legacy JSON format: "__PRICING_TIERS__:[...]"
  if (rawDesc.includes(LEGACY_PREFIX)) {
    const [textPart, jsonPart] = rawDesc.split(LEGACY_PREFIX)
    try {
      const parsed = JSON.parse(jsonPart.trim())
      const pricingTiers = normalizePricingTiers(parsed, hourlyRate)
      const oneHourTier = pricingTiers.find((t) => Number(t.durationHours) === 1)
      return {
        cleanDescription: textPart.trim(),
        pricingTiers,
        effectiveHourlyRate: oneHourTier ? Number(oneHourTier.price) : hourlyRate,
      }
    } catch {
      // Fallback to default tiers
    }
  }

  return {
    cleanDescription: rawDesc.trim(),
    pricingTiers: getDefaultPricingTiers(hourlyRate),
    effectiveHourlyRate: hourlyRate,
  }
}

export function encodeTableDescription(
  cleanDescription = '',
  pricingTiers = [],
  hourlyRate = 200
) {
  const normalized = normalizePricingTiers(pricingTiers, hourlyRate)
  const pairs = []

  // Build compact pairs: "0.5=100,1=200,1.5=300,2=400"
  for (const tier of normalized) {
    const pair = `${Number(tier.durationHours)}=${Number(tier.price)}`
    const candidate = `${COMPACT_PREFIX}${[...pairs, pair].join(',')}`
    if (candidate.length <= MAX_VARCHAR_LEN) {
      pairs.push(pair)
    }
  }

  const compactBlock = `${COMPACT_PREFIX}${pairs.join(',')}`
  const text = String(cleanDescription || '').trim()

  if (!text) {
    return compactBlock
  }

  const remainingSpace = MAX_VARCHAR_LEN - compactBlock.length - 1
  if (remainingSpace <= 0) {
    return compactBlock
  }

  const safeText = text.slice(0, remainingSpace)
  return `${safeText}\n${compactBlock}`
}

/**
 * Given a table and requested durationHours, returns the exact configured price
 * from the table's custom pricingTiers if a tier matches, or interpolates using hourlyRate.
 */
export function getTablePriceForDuration(table, durationHours = 1) {
  const dur = Number(durationHours || 1)
  const { pricingTiers, effectiveHourlyRate } = parseTablePricing(table)
  const exactMatch = pricingTiers.find(
    (t) => Math.abs(Number(t.durationHours) - dur) < 0.001
  )
  if (exactMatch) {
    return Number(exactMatch.price)
  }
  return Number((dur * effectiveHourlyRate).toFixed(2))
}
