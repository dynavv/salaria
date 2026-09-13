#!/usr/bin/env python3
import sys
import json
import re

DANGEROUS_PATTERNS = [
    r'rm\s+-rf\s+/',
    r'rm\s+-rf\s+~',
    r'rm\s+-rf\s+\*',
    r'git\s+reset\s+--hard',
    r'git\s+clean\s+-fdx',
    r'git\s+push\s+.*--force',
    r'DROP\s+TABLE',
    r'DROP\s+DATABASE',
    r'wrangler\s+d1\s+execute\s+.*--remote.*drop',
]

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"decision": "allow"}))
            return

        payload = json.loads(raw_input)
        tool_call = payload.get("toolCall", {})
        tool_name = tool_call.get("name", "")
        args = tool_call.get("args", {})

        if tool_name == "run_command":
            cmd = args.get("CommandLine", "")
            for pattern in DANGEROUS_PATTERNS:
                if re.search(pattern, cmd, re.IGNORECASE):
                    print(json.dumps({
                        "decision": "ask",
                        "reason": f"⚠️ [Salarini Safety Gate] Lệnh dòng lệnh '{cmd}' khớp với mẫu cảnh báo rủi ro ('{pattern}'). Cần xác nhận từ người dùng trước khi tiếp tục."
                    }))
                    return

        print(json.dumps({"decision": "allow"}))
    except Exception as e:
        # Fallback an toàn, không làm gián đoạn luồng
        print(json.dumps({"decision": "allow"}))

if __name__ == "__main__":
    main()
