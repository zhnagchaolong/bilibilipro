export interface Quality {
  id: number
  label: string
  url: string
  size?: number
  bandwidth?: number
}

export interface VideoPage {
  cid: number
  page: number
  part: string
  duration?: number
}

export interface ParsedResult {
  bvid: string
  title: string
  pic: string
  audioUrl: string
  qualities: Quality[]
  pages?: VideoPage[]
  selectedQualityUrl: string
  selectedPages: number[]
  audioBandwidth?: number
  isSliceMode?: boolean
  isMergedSliceMode?: boolean
  sliceTargets?: SliceTarget[]
}

export interface RawApiData {
  title: string
  pic: string
  audioUrl: string
  qualities: Quality[]
  pages?: VideoPage[]
  audioBandwidth?: number
}

export interface TaskRecord {
  taskId: string
  bvid: string
  title: string
  cover: string
  qualityLabel: string
  status: 'downloading' | 'merging' | 'success' | 'error' | 'paused'
  progress: number
  statusMsg: string
  filePath?: string
  date: string
  speed?: string
  folderId?: string
  isSliceMode?: boolean
  sliceTargets?: SliceTarget[]
}

export interface CustomFolder {
  id: string
  name: string
}

export interface SliceTarget {
  start: number
  end: number
  titleExt?: string
}

export interface GroupDisplay {
  isCustomFolder: boolean
  id: string
  title: string
  mainCover: string
  aggregateDate: string
  tasks: TaskRecord[]
}
