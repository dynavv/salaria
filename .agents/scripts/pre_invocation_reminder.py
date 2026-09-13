#!/usr/bin/env python3
import sys
import json

def main():
    try:
        # Đọc input từ stdin
        _ = sys.stdin.read()
        output = {
            "injectSteps": [
                {
                    "ephemeralMessage": "📌 [Salarini Guardrail] Ghi nhớ: Phản hồi bằng Tiếng Việt; giải thích rõ trước khi chạy lệnh; phân tích kỹ lỗi P0/P1 trước khi sửa; kiểm tra tính toàn vẹn số dư tài chính."
                }
            ]
        }
        print(json.dumps(output))
    except Exception:
        print(json.dumps({}))

if __name__ == "__main__":
    main()
