#!/usr/bin/env python3
"""فحص صورة معاينة الطباعة على المحاكي (من غير مكتبات خارجية).

الصفحة print-check.html فيها مربع لونه ماجنتا: لازم يظهر في المعاينة (يعني المعاينة اترسمت فعلاً)،
ومن غير أي إطار بلون خلفية الـ WebView الكحلي #002624 حوالين الورقة.
الاستخدام: python3 tools/print-frame-check.py shots/print-preview.png
"""
import struct
import sys
import zlib


def read_png(path):
    data = open(path, 'rb').read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a PNG'
    pos, idat, w = 8, b'', 0
    while pos < len(data):
        ln, typ = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + ln]
        if typ == b'IHDR':
            w, h, depth, ctype, _, _, interlace = struct.unpack('>IIBBBBB', body)
            assert depth == 8 and interlace == 0 and ctype in (2, 6), 'unsupported PNG'
            bpp = 4 if ctype == 6 else 3
        elif typ == b'IDAT':
            idat += body
        pos += 12 + ln
    raw = zlib.decompress(idat)
    stride, rows, prev, i = w * bpp, [], bytearray(w * bpp), 0
    for _ in range(h):
        f = raw[i]; line = bytearray(raw[i + 1:i + 1 + stride]); i += 1 + stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(bytes(line)); prev = line
    return w, h, bpp, rows


def main(path):
    w, h, bpp, rows = read_png(path)
    navy = magenta = 0
    # منطقة المعاينة: من غير شريط الحالة وأزرار النظام
    for y in range(int(h * 0.06), int(h * 0.75)):
        r = rows[y]
        for x in range(0, w * bpp, bpp):
            R, G, B = r[x], r[x + 1], r[x + 2]
            if R < 14 and 26 <= G <= 50 and 24 <= B <= 48: navy += 1
            elif R > 200 and G < 70 and B > 200: magenta += 1
    print('print preview: magenta px=%d, navy-frame px=%d (%dx%d)' % (magenta, navy, w, h))
    if magenta < 200:
        print('::error::معاينة الطباعة ما ظهرتش (مفيش المربع الماجنتا)'); return 1
    if navy > 150:
        print('::error::فيه إطار كحلي حوالين ورقة الطباعة'); return 1
    print('✔ معاينة الطباعة: الورقة بيضا من غير إطار')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
