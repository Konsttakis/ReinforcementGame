import urllib.request
import struct

def get_png_color(filename):
    with open(filename, 'rb') as f:
        data = f.read()
    # Find IDAT chunk
    # This is too complex to parse PNG in raw python without PIL
    pass
