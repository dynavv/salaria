import { Router } from 'express';
import { 
  getTelegramConfig, 
  saveTelegramConfig, 
  testTelegramBot, 
  syncTelegramUpdates 
} from '../services/telegramBotSync';

export const telegramRouter = Router();

// GET telegram configuration
telegramRouter.get('/config', (req, res) => {
  try {
    const config = getTelegramConfig();
    res.json({
      success: true,
      data: {
        configured: Boolean(config.botToken),
        botUsername: config.botUsername,
        autoSync: config.autoSync,
        replyEnabled: config.replyEnabled,
        lastSyncTime: config.lastSyncTime,
        // Mask token for security in UI
        maskedToken: config.botToken
          ? `${config.botToken.substring(0, 6)}...${config.botToken.substring(config.botToken.length - 5)}`
          : '',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST save telegram configuration
telegramRouter.post('/config', async (req, res) => {
  try {
    const { botToken, autoSync, replyEnabled } = req.body;

    let botUsername = undefined;
    if (botToken && botToken.trim()) {
      const testResult = await testTelegramBot(botToken.trim());
      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          error: testResult.error || 'Token không hợp lệ. Vui lòng kiểm tra lại!',
        });
      }
      botUsername = testResult.username;
    }

    saveTelegramConfig({
      botToken: botToken !== undefined ? botToken.trim() : undefined,
      botUsername,
      autoSync: autoSync !== undefined ? Boolean(autoSync) : undefined,
      replyEnabled: replyEnabled !== undefined ? Boolean(replyEnabled) : undefined,
    });

    res.json({
      success: true,
      message: 'Đã lưu cấu hình Telegram Bot thành công!',
      botUsername,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST test telegram bot connection
telegramRouter.post('/test', async (req, res) => {
  try {
    const { botToken } = req.body;
    if (!botToken || !botToken.trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập Token Bot' });
    }

    const result = await testTelegramBot(botToken.trim());
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      message: `Kết nối thành công tới Bot: @${result.username} (${result.botName})`,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST trigger telegram sync now
telegramRouter.post('/sync', async (req, res) => {
  try {
    const result = await syncTelegramUpdates();
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      data: {
        syncedCount: result.syncedCount,
        transactions: result.transactions,
        message: result.syncedCount > 0
          ? `Đã đồng bộ thành công ${result.syncedCount} giao dịch mới từ Telegram!`
          : 'Không có tin nhắn chi tiêu mới nào từ Telegram.',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
