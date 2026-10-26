import { describe, expect, it } from 'vitest'
import { parseDataset, selectedPoints, validateSelection } from './dataset'

describe('dataset parsing', () => {
  it('parses CSV and reports excluded rows', async () => {
    const file = new File(['hours,score\n1,25\n2,35\n3,bad\n4,62'], 'study.csv', { type: 'text/csv' })
    const dataset = await parseDataset(file)
    expect(dataset.numericColumns).toEqual(['hours', 'score'])
    expect(selectedPoints(dataset)).toEqual({ points: [{ x: 1, y: 25 }, { x: 2, y: 35 }, { x: 4, y: 62 }], excluded: 1 })
    expect(validateSelection(dataset)).toBeNull()
    expect(validateSelection({ ...dataset, yColumn: 'hours' })).toMatch(/different/)
  })

  it('parses flat JSON and rejects nested or invalid data', async () => {
    const good = new File(['[{"a":1,"b":2},{"a":2,"b":3}]'], 'data.json')
    expect((await parseDataset(good)).rows).toHaveLength(2)
    await expect(parseDataset(new File(['[{"a":{"b":2}}]'], 'data.json'))).rejects.toThrow(/Nested/)
    await expect(parseDataset(new File(['wrong'], 'data.json'))).rejects.toThrow(/could not be parsed/)
    await expect(parseDataset(new File(['a,b\n1,foo\n2,bar'], 'data.csv'))).rejects.toThrow(/numeric column/)
  })

  it('rejects constant X and oversized files', async () => {
    const dataset = await parseDataset(new File(['x,y\n1,2\n2,3'], 'ok.csv'))
    expect(validateSelection({ ...dataset, rows: [{ x: 1, y: 2 }, { x: 1, y: 3 }] })).toMatch(/vary/)
    await expect(parseDataset(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.csv'))).rejects.toThrow(/5 MB/)
  })
})
