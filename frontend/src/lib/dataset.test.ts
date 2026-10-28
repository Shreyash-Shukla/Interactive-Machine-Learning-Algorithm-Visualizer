import { describe, expect, it } from 'vitest'
import { parseDataset, selectedLabeledPoints, selectedPoints, validateClassificationSelection, validateSelection } from './dataset'

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

  it('enforces algorithm-specific point requirements', async () => {
    const dataset = await parseDataset(new File(['x,y\n1,2\n1,2\n1,3'], 'points.csv'))
    expect(validateSelection(dataset, 'kmeans', 3)).toMatch(/distinct/)
    expect(validateSelection(dataset, 'kmeans', 2)).toBeNull()
    expect(validateSelection(dataset, 'knn', 3)).toBeNull()
    expect(validateSelection(dataset, 'knn', 5)).toMatch(/usable/)
    expect(validateSelection({ ...dataset, yColumn: 'x' }, 'knn', 1)).toMatch(/different/)
  })

  it('parses labeled rows and validates classification columns', async () => {
    const dataset = await parseDataset(new File([
      'length,width,species\n1.2,0.2,Setosa\n1.5,0.3,Setosa\n4.0,1.2,Versicolor\n4.3,1.4,Versicolor\n5.1,bad,Virginica',
    ], 'flowers.csv'))
    expect(dataset.labelColumn).toBe('species')
    expect(selectedLabeledPoints(dataset)).toEqual({
      points: [
        { x: 1.2, y: 0.2, label: 'Setosa' }, { x: 1.5, y: 0.3, label: 'Setosa' },
        { x: 4, y: 1.2, label: 'Versicolor' }, { x: 4.3, y: 1.4, label: 'Versicolor' },
      ], excluded: 1,
    })
    expect(validateClassificationSelection(dataset, 3)).toBeNull()
    expect(validateClassificationSelection(dataset, 5)).toMatch(/At least 5/)
    expect(validateClassificationSelection({ ...dataset, labelColumn: 'length' }, 3)).toMatch(/different/)
  })
})
