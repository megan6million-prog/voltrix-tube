import * as TaskManager from 'expo-task-manager'
import * as BackgroundFetch from 'expo-background-fetch'
import * as Battery from 'expo-battery'
import * as Notifications from 'expo-notifications'
import { api } from './api'

export const TASK_NAME = 'voltrix-earn'

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false })
})

async function notify(title, body) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null
  })
}

// Define the background task
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    // Battery guard — skip if below 30%
    const level = await Battery.getBatteryLevelAsync()
    const state = await Battery.getBatteryStateAsync()
    const isCharging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL
    if (level < 0.30 && !isCharging) return BackgroundFetch.BackgroundFetchResult.NoData

    // Heartbeat
    await api.heartbeat()

    // Fetch active modules and simulate earning
    const modules = await api.getActiveModules()
    let totalEarned = 0
    for (const mod of modules) {
      const amount = parseFloat((Math.random() * 0.02).toFixed(6))
      if (amount > 0) {
        await api.creditEarning(mod.id, amount)
        totalEarned += amount
      }
    }

    // Notify on milestone
    const summary = await api.getEarnings()
    if (summary.total && Math.floor(summary.total) > Math.floor(summary.total - totalEarned)) {
      await notify('⚡ Voltrix', `You've earned ${Math.floor(summary.total)} pts total!`)
    }

    return BackgroundFetch.BackgroundFetchResult.NewData
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

export async function registerBackgroundTask() {
  await Notifications.requestPermissionsAsync()

  const status = await BackgroundFetch.getStatusAsync()
  if (status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied) return

  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME)
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60 * 15,
      stopOnTerminate: false,
      startOnBoot: true
    })
  }
}
