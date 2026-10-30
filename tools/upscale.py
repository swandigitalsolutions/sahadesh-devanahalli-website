"""Real-ESRGAN x4plus (RRDBNet) on CPU, tiled. Weights load with weights_only=True.

Model: tools/models/RealESRGAN_x4plus.pth from github.com/xinntao/Real-ESRGAN releases v0.1.0
(sha256 4fa0d38905f75ac06eb49a7951b426670021be3018265fd191d2125df9d682f1).
"""
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.nn import functional as F
from PIL import Image

MODEL = Path(__file__).resolve().parent / "models" / "RealESRGAN_x4plus.pth"


class ResidualDenseBlock(nn.Module):
    def __init__(self, nf=64, gc=32):
        super().__init__()
        self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1)
        self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1)
        self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1)
        self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1)
        self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        x1 = self.lrelu(self.conv1(x))
        x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
        x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
        return x5 * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, nf, gc=32):
        super().__init__()
        self.rdb1 = ResidualDenseBlock(nf, gc)
        self.rdb2 = ResidualDenseBlock(nf, gc)
        self.rdb3 = ResidualDenseBlock(nf, gc)

    def forward(self, x):
        return self.rdb3(self.rdb2(self.rdb1(x))) * 0.2 + x


class RRDBNet(nn.Module):
    def __init__(self, nf=64, nb=23, gc=32):
        super().__init__()
        self.conv_first = nn.Conv2d(3, nf, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(nf, gc) for _ in range(nb)])
        self.conv_body = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up1 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up2 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_hr = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_last = nn.Conv2d(nf, 3, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        feat = self.conv_first(x)
        feat = feat + self.conv_body(self.body(feat))
        feat = self.lrelu(self.conv_up1(F.interpolate(feat, scale_factor=2, mode="nearest")))
        feat = self.lrelu(self.conv_up2(F.interpolate(feat, scale_factor=2, mode="nearest")))
        return self.conv_last(self.lrelu(self.conv_hr(feat)))


_net = None


def _model():
    global _net
    if _net is None:
        torch.set_num_threads(max(1, torch.get_num_threads()))
        net = RRDBNet()
        state = torch.load(MODEL, map_location="cpu", weights_only=True)
        net.load_state_dict(state.get("params_ema", state), strict=True)
        _net = net.eval()
    return _net


@torch.inference_mode()
def upscale4(img: Image.Image, tile: int = 200, pad: int = 10) -> Image.Image:
    """Return a 4x Real-ESRGAN upscale of an RGB PIL image (processed in tiles)."""
    net = _model()
    arr = torch.from_numpy(np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0).permute(2, 0, 1)[None]
    _, _, h, w = arr.shape
    out = torch.zeros((1, 3, h * 4, w * 4))
    for y in range(0, h, tile):
        for x in range(0, w, tile):
            y0, x0 = max(0, y - pad), max(0, x - pad)
            y1, x1 = min(h, y + tile + pad), min(w, x + tile + pad)
            res = net(arr[:, :, y0:y1, x0:x1])
            ty, tx = (y - y0) * 4, (x - x0) * 4
            th, tw = (min(h, y + tile) - y) * 4, (min(w, x + tile) - x) * 4
            out[:, :, y * 4:y * 4 + th, x * 4:x * 4 + tw] = res[:, :, ty:ty + th, tx:tx + tw]
    data = (out[0].clamp(0, 1).permute(1, 2, 0).numpy() * 255.0).round().astype(np.uint8)
    return Image.fromarray(data)
