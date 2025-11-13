import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Alert, Platform } from 'react-native'

type ReportFormat = 'csv' | 'xlsx'

type HistoryOptions = {
    fromDate?: string  // "YYYY-MM-DD"
    toDate?: string    // "YYYY-MM-DD"
    format?: ReportFormat
}

export async function downloadMealsHistory(
    API_URL: string,
    token: string,
    options: HistoryOptions = {}
) {
    const { fromDate, toDate, format = 'xlsx' } = options

    try {
        const params = new URLSearchParams()
        params.append('format', format)

        if (fromDate) params.append('from_date', fromDate)
        if (toDate) params.append('to_date', toDate)

        const url = `${API_URL}/meals/export_history?${params.toString()}`

        if (Platform.OS === 'web') {
            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)

            const blob = await res.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = downloadUrl
            const suffix = fromDate || toDate ? 'range' : 'all'
            a.download = `nutriapp_meals_${suffix}.${format}`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(downloadUrl)
        } else {
            const suffix = fromDate || toDate ? 'range' : 'all'
            const fileUri =
                FileSystem.documentDirectory +
                `nutriapp_meals_${suffix}.${format}`

            const { uri } = await FileSystem.downloadAsync(url, fileUri, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            const canShare = await Sharing.isAvailableAsync()
            if (canShare) {
                await Sharing.shareAsync(uri)
            } else {
                Alert.alert('Archivo descargado', `Guardado en: ${uri}`)
            }
        }
    } catch (err) {
        console.error(err)
        Alert.alert('Error', 'No se pudo generar el reporte.')
    }
}
