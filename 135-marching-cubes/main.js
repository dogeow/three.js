import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Marching Cubes Lookup Tables ────────────────────────────────────────────

// Edge table: which edges of the cube are intersected by the iso-surface
const edgeTable = new Int32Array([
  0x0,   0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
  0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
  0x190, 0x99,  0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
  0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
  0x230, 0x339, 0x33,  0x13a, 0x636, 0x73f, 0x435, 0x53c,
  0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
  0x3a0, 0x2a9, 0x1a3, 0xaa,  0x7a6, 0x6af, 0x5a5, 0x4ac,
  0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
  0x460, 0x569, 0x663, 0x76a, 0x66,  0x16f, 0x265, 0x36c,
  0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
  0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff,  0x3f5, 0x2fc,
  0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
  0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55,  0x15c,
  0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
  0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc,
  0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
  0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc,
  0xcc,  0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
  0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c,
  0x15c, 0x55,  0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
  0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
  0x2fc, 0x3f5, 0xff,  0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
  0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c,
  0x36c, 0x265, 0x16f, 0x66,  0x76a, 0x663, 0x569, 0x460,
  0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac,
  0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa,  0x1a3, 0x2a9, 0x3a0,
  0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c,
  0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33,  0x339, 0x230,
  0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c,
  0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99,  0x190,
  0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c,
  0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0
]);

// Triangle table: for each of the 256 configurations, list the edge pairs forming triangles
// Each entry is up to 15 edges (5 triangles × 3 edges), terminated with -1
const triTable = [
  [-1], // 0
  [0,8,3,-1], // 1
  [0,1,9,-1], // 2
  [1,8,3,9,8,1,-1], // 3
  [1,2,10,-1], // 4
  [0,8,3,1,2,10,-1], // 5
  [9,2,10,0,2,9,-1], // 6
  [2,8,3,2,10,8,10,9,8,-1], // 7
  [3,11,2,-1], // 8
  [0,11,2,8,11,0,-1], // 9
  [1,9,0,2,3,11,-1], // 10
  [1,11,2,1,9,11,9,8,11,-1], // 11
  [3,10,1,11,10,3,-1], // 12
  [0,10,1,0,8,10,8,11,10,-1], // 13
  [3,9,0,3,11,9,11,10,9,-1], // 14
  [9,8,10,10,8,11,-1], // 15
  [4,7,8,-1], // 16
  [4,3,0,7,3,4,-1], // 17
  [0,1,9,8,4,7,-1], // 18
  [4,1,9,4,7,1,7,3,1,-1], // 19
  [1,2,10,8,4,7,-1], // 20
  [3,4,7,3,0,4,1,2,10,-1], // 21
  [9,2,10,9,0,2,8,4,7,-1], // 22
  [2,10,9,2,9,7,2,7,3,7,9,4,-1], // 23
  [8,4,7,3,11,2,-1], // 24
  [11,4,7,11,2,4,2,0,4,-1], // 25
  [9,0,1,8,4,7,2,3,11,-1], // 26
  [4,7,11,9,4,11,9,11,2,9,2,1,-1], // 27
  [3,10,1,3,11,10,7,8,4,-1], // 28
  [1,11,10,1,4,11,1,0,4,7,11,4,-1], // 29
  [4,7,8,9,0,11,10,1,11,-1], // 30
  [9,4,11,2,1,11,9,11,4,-1], // 31
  [4,7,8,9,5,11,-1], // 32
  [0,7,8,0,5,7,0,1,5,11,5,1,-1], // 33
  [4,7,8,0,4,8,1,5,9,-1], // 34
  [4,7,8,1,5,9,5,3,9,-1], // 35
  [1,2,10,9,5,11,-1], // 36
  [0,8,3,1,2,10,5,11,9,-1], // 37
  [10,0,2,10,9,0,5,11,9,-1], // 38
  [2,10,9,2,9,7,2,7,3,7,9,5,-1], // 39
  [7,8,4,11,2,3,10,1,5,-1], // 40
  [5,11,2,4,7,8,0,1,3,-1], // 41
  [9,5,10,9,0,5,7,8,4,-1], // 42
  [5,10,0,5,0,4,5,4,9,7,4,5,-1], // 43
  [8,3,2,8,2,4,4,2,11,-1], // 44
  [0,4,2,4,2,11,0,2,1,11,2,1,-1], // 45
  [3,2,11,0,1,9,8,4,7,-1], // 46
  [2,11,9,2,9,4,2,4,1,4,9,5,-1], // 47
  [10,1,5,10,5,7,7,5,3,-1], // 48
  [10,1,5,10,5,7,8,0,4,-1], // 49
  [0,4,7,0,7,9,0,9,1,5,9,7,-1], // 50
  [4,7,9,5,4,9,5,9,1,5,1,10,-1], // 51
  [8,4,7,8,7,3,10,1,2,-1], // 52
  [10,1,2,9,8,0,7,8,4,-1], // 53
  [0,2,9,4,7,8,10,1,5,-1], // 54
  [9,4,7,9,7,5,9,5,10,9,10,2,-1], // 55
  [3,2,11,8,4,7,10,1,5,-1], // 56
  [5,11,2,4,7,8,10,1,0,-1], // 57
  [5,11,2,9,8,0,7,8,4,-1], // 58
  [2,11,9,5,11,9,2,9,0,5,9,4,-1], // 59
  [8,3,2,8,2,4,4,2,11,-1], // 60
  [0,4,2,4,2,11,0,2,1,11,2,1,-1], // 61
  [3,2,11,0,1,9,8,4,7,-1], // 62
  [2,11,9,2,9,4,2,4,1,4,9,5,-1], // 63
  [7,8,5,7,5,10,10,5,1,-1], // 64
  [8,5,0,8,0,7,5,1,0,10,0,1,-1], // 65
  [7,8,5,7,5,10,0,4,1,-1], // 66
  [7,8,5,7,5,10,4,1,5,-1], // 67
  [5,0,4,5,4,11,5,11,10,11,4,3,-1], // 68
  [0,4,11,0,11,5,4,3,11,5,11,10,-1], // 69
  [4,11,5,4,5,1,0,4,8,-1], // 70
  [4,11,5,4,5,1,4,1,0,3,1,4,-1], // 71
  [2,10,1,5,7,8,-1], // 72
  [8,5,1,8,1,7,5,10,1,4,7,1,-1], // 73
  [0,4,1,5,7,8,-1], // 74
  [4,1,0,4,1,7,4,7,5,7,1,3,-1], // 75
  [2,10,1,4,11,5,8,4,7,-1], // 76
  [10,1,4,10,4,5,1,3,4,7,4,5,-1], // 77
  [8,4,11,8,11,5,11,4,3,-1], // 78
  [0,4,11,0,11,5,0,5,1,5,11,3,-1], // 79
  [8,4,11,8,11,5,11,4,3,-1], // 80
  [0,4,11,0,11,5,0,5,1,5,11,3,-1], // 81
  [1,2,10,4,11,5,8,4,7,-1], // 82
  [10,1,4,10,4,5,1,3,4,7,4,5,-1], // 83
  [6,7,10,7,8,10,8,9,10,-1], // 84
  [0,7,10,0,10,1,7,8,10,9,10,6,-1], // 85
  [10,6,7,1,10,7,1,7,0,8,7,1,-1], // 86
  [10,6,7,1,10,7,1,7,0,8,7,1,-1], // 87
  [1,5,10,6,7,8,8,7,3,-1], // 88
  [1,5,10,6,7,8,8,7,3,-1], // 89
  [0,4,8,10,1,5,-1], // 90
  [4,1,0,4,5,1,4,7,5,6,5,7,-1], // 91
  [8,0,2,8,2,3,10,1,5,-1], // 92
  [2,10,1,2,1,5,2,5,0,4,5,2,-1], // 93
  [6,7,8,6,8,3,11,0,4,-1], // 94
  [11,0,4,11,4,3,6,7,8,-1], // 95
  [7,3,6,7,8,3,8,0,3,6,3,10,-1], // 96
  [6,7,8,6,8,3,11,0,4,-1], // 97
  [8,3,2,8,2,4,4,2,11,-1], // 98
  [0,4,2,4,2,11,0,2,1,11,2,1,-1], // 99
  [3,2,11,0,1,9,8,4,7,-1], // 100
  [2,11,9,2,9,4,2,4,1,4,9,5,-1], // 101
  [5,10,6,5,6,3,5,3,1,3,6,7,-1], // 102
  [0,4,1,5,10,6,-1], // 103
  [8,0,2,8,2,3,10,1,5,-1], // 104
  [2,10,1,2,1,5,2,5,0,4,5,2,-1], // 105
  [6,7,8,6,8,3,11,0,4,-1], // 106
  [11,0,4,11,4,3,6,7,8,-1], // 107
  [8,3,2,8,2,4,4,2,11,-1], // 108
  [0,4,2,4,2,11,0,2,1,11,2,1,-1], // 109
  [3,2,11,0,1,9,8,4,7,-1], // 110
  [2,11,9,2,9,4,2,4,1,4,9,5,-1], // 111
  [7,10,5,7,5,6,5,10,1,-1], // 112
  [5,6,7,5,7,10,5,10,1,8,0,9,-1], // 113
  [0,4,10,0,10,5,4,7,10,6,10,7,-1], // 114
  [7,10,5,7,5,6,7,8,5,8,0,5,-1], // 115
  [11,5,10,11,10,3,5,0,10,4,10,0,-1], // 116
  [5,11,10,5,10,6,4,7,8,-1], // 117
  [6,3,11,6,3,10,0,4,1,-1], // 118
  [8,0,9,6,3,11,10,1,5,-1], // 119
  [10,3,6,10,1,3,1,0,3,9,0,1,-1], // 120
  [6,3,11,6,3,10,0,4,1,-1], // 121
  [8,3,2,8,2,4,4,2,11,-1], // 122
  [0,4,2,4,2,11,0,2,1,11,2,1,-1], // 123
  [3,2,11,0,1,9,8,4,7,-1], // 124
  [2,11,9,2,9,4,2,4,1,4,9,5,-1], // 125
  [5,10,6,5,6,3,5,3,1,3,6,7,-1], // 126
  [0,4,1,5,10,6,-1], // 127
  [9,5,11,9,11,8,11,5,6,-1], // 128
  [9,5,0,9,0,6,0,1,6,11,6,0,-1], // 129
  [0,5,8,0,8,11,5,6,8,3,8,6,-1], // 130
  [5,6,11,0,5,11,0,11,8,0,8,9,-1], // 131
  [10,1,2,9,5,11,-1], // 132
  [0,8,3,1,2,10,9,5,11,-1], // 133
  [10,0,2,10,9,0,5,11,9,-1], // 134
  [2,10,9,2,9,7,2,7,3,7,9,5,-1], // 135
  [8,4,10,8,10,3,10,4,1,11,3,10,-1], // 136
  [10,1,2,10,1,0,10,0,3,4,0,10,-1], // 137
  [9,5,10,9,10,0,5,3,10,4,10,3,-1], // 138
  [5,10,0,5,0,4,5,4,9,3,4,5,-1], // 139
  [8,4,10,8,10,3,10,4,1,11,3,10,-1], // 140
  [10,1,2,10,1,0,10,0,3,4,0,10,-1], // 141
  [9,5,10,9,10,0,5,3,10,4,10,3,-1], // 142
  [5,10,0,5,0,4,5,4,9,3,4,5,-1], // 143
  [9,7,8,5,7,9,-1], // 144
  [9,3,0,9,5,3,5,7,3,-1], // 145
  [0,7,8,0,1,7,1,5,7,-1], // 146
  [1,5,3,3,5,7,-1], // 147
  [9,7,8,9,8,0,10,1,2,-1], // 148
  [9,3,0,9,5,3,10,1,2,-1], // 149
  [0,2,10,4,7,8,-1], // 150
  [2,10,9,2,9,4,2,4,3,4,9,5,-1], // 151
  [8,4,10,8,10,3,11,2,5,-1], // 152
  [0,4,11,0,11,2,4,5,11,10,11,5,-1], // 153
  [3,10,1,3,11,10,5,8,9,-1], // 154
  [5,11,10,5,10,1,5,1,0,4,1,5,-1], // 155
  [8,4,11,8,11,5,2,10,3,-1], // 156
  [2,10,5,2,5,3,0,4,5,0,5,1,-1], // 157
  [3,2,11,8,4,11,9,5,4,-1], // 158
  [5,3,11,5,1,3,9,4,1,-1], // 159
  [9,7,8,9,8,2,9,2,1,2,8,3,-1], // 160
  [2,9,1,2,9,7,2,7,3,0,7,9,-1], // 161
  [9,7,8,9,8,0,0,1,8,2,8,1,-1], // 162
  [1,7,3,1,7,9,1,9,0,7,9,2,-1], // 163
  [1,2,10,8,4,7,2,1,7,-1], // 164
  [1,2,10,9,7,8,9,2,7,-1], // 165
  [4,7,8,2,1,0,-1], // 166
  [9,2,1,9,7,2,9,4,7,2,1,3,-1], // 167
  [8,4,11,3,10,1,7,2,5,-1], // 168
  [5,7,2,5,2,11,4,0,3,4,1,0,-1], // 169
  [2,10,1,2,1,3,8,4,11,-1], // 170
  [4,11,10,4,10,1,4,1,0,11,1,3,-1], // 171
  [2,5,7,2,7,8,2,8,3,8,7,4,-1], // 172
  [9,5,7,9,7,2,9,2,1,7,2,3,-1], // 173
  [8,4,11,8,11,2,2,11,3,-1], // 174
  [0,4,11,0,11,2,0,2,1,11,2,3,-1], // 175
  [3,9,5,3,5,1,3,1,2,9,0,1,-1], // 176
  [0,9,1,11,2,3,-1], // 177
  [8,4,11,8,11,5,11,4,3,-1], // 178
  [0,4,11,0,11,5,0,5,1,5,11,3,-1], // 179
  [9,7,8,9,8,2,9,2,1,2,8,3,-1], // 180
  [2,9,1,2,9,7,2,7,3,0,7,9,-1], // 181
  [9,7,8,9,8,0,0,1,8,2,8,1,-1], // 182
  [1,7,3,1,7,9,1,9,0,7,9,2,-1], // 183
  [1,2,10,8,4,7,2,1,7,-1], // 184
  [1,2,10,9,7,8,9,2,7,-1], // 185
  [4,7,8,2,1,0,-1], // 186
  [9,2,1,9,7,2,9,4,7,2,1,3,-1], // 187
  [8,4,11,3,10,1,7,2,5,-1], // 188
  [5,7,2,5,2,11,4,0,3,4,1,0,-1], // 189
  [2,10,1,2,1,3,8,4,11,-1], // 190
  [4,11,10,4,10,1,4,1,0,11,1,3,-1], // 191
  [7,10,6,7,8,10,8,9,10,-1], // 192
  [0,7,10,0,10,1,7,8,10,9,10,6,-1], // 193
  [10,6,7,1,10,7,1,7,0,8,7,1,-1], // 194
  [10,6,7,1,10,7,1,7,0,8,7,1,-1], // 195
  [10,1,5,10,5,6,1,2,5,8,5,2,-1], // 196
  [0,8,2,0,2,5,0,5,1,5,2,6,6,2,10,-1], // 197
  [1,5,0,1,0,4,10,1,6,-1], // 198
  [1,5,6,1,6,10,5,4,6,8,6,4,-1], // 199
  [2,10,1,8,3,6,-1], // 200
  [1,6,10,1,0,6,0,3,6,-1], // 201
  [8,0,2,8,2,3,9,5,10,-1], // 202
  [10,9,5,6,10,9,2,1,9,-1], // 203
  [3,6,8,3,8,0,6,10,8,1,8,10,-1], // 204
  [6,10,8,6,8,3,10,1,8,0,8,9,-1], // 205
  [9,5,10,9,10,1,5,3,10,0,10,3,-1], // 206
  [5,10,0,5,0,4,5,4,9,3,4,5,-1], // 207
  [10,1,5,10,5,6,1,2,5,8,5,2,-1], // 208
  [0,8,2,0,2,5,0,5,1,5,2,6,6,2,10,-1], // 209
  [1,5,0,1,0,4,10,1,6,-1], // 210
  [1,5,6,1,6,10,5,4,6,8,6,4,-1], // 211
  [2,10,1,8,3,6,-1], // 212
  [1,6,10,1,0,6,0,3,6,-1], // 213
  [8,0,2,8,2,3,9,5,10,-1], // 214
  [10,9,5,6,10,9,2,1,9,-1], // 215
  [3,6,8,3,8,0,6,10,8,1,8,10,-1], // 216
  [6,10,8,6,8,3,10,1,8,0,8,9,-1], // 217
  [9,5,10,9,10,1,5,3,10,0,10,3,-1], // 218
  [5,10,0,5,0,4,5,4,9,3,4,5,-1], // 219
  [9,7,8,5,7,9,10,6,5,-1], // 220
  [5,9,0,5,0,6,5,6,10,6,0,3,-1], // 221
  [8,0,9,8,9,6,8,6,5,10,6,8,-1], // 222
  [10,6,5,-1], // 223
  [11,5,10,11,10,3,5,0,10,4,10,0,-1], // 224
  [0,11,8,0,5,11,0,1,5,10,11,5,-1], // 225
  [10,5,11,10,11,3,9,0,5,0,11,8,-1], // 226
  [10,5,11,10,11,3,9,0,5,0,11,8,-1], // 227
  [2,1,5,2,5,10,2,10,3,10,5,11,-1], // 228
  [0,11,8,0,5,11,0,1,5,10,11,5,-1], // 229
  [0,2,5,0,5,10,0,10,1,3,10,5,-1], // 230
  [2,5,10,2,10,3,4,0,8,-1], // 231
  [11,5,10,11,10,3,5,0,10,4,10,0,-1], // 232
  [0,11,8,0,5,11,0,1,5,10,11,5,-1], // 233
  [10,5,11,10,11,3,9,0,5,0,11,8,-1], // 234
  [10,5,11,10,11,3,9,0,5,0,11,8,-1], // 235
  [2,1,5,2,5,10,2,10,3,10,5,11,-1], // 236
  [0,11,8,0,5,11,0,1,5,10,11,5,-1], // 237
  [0,2,5,0,5,10,0,10,1,3,10,5,-1], // 238
  [2,5,10,2,10,3,4,0,8,-1], // 239
  [7,8,10,8,9,10,-1], // 240
  [7,8,10,8,9,10,-1], // 241
  [0,4,3,10,7,8,-1], // 242
  [4,1,0,4,5,1,10,7,8,-1], // 243
  [8,10,7,8,9,10,8,0,9,3,10,0,-1], // 244
  [10,7,8,10,0,7,10,1,0,9,7,0,-1], // 245
  [10,7,8,8,9,10,10,1,9,3,10,0,-1], // 246
  [10,1,9,10,0,1,10,7,0,8,0,7,-1], // 247
  [2,4,3,2,3,10,4,1,3,7,3,1,-1], // 248
  [1,10,2,1,2,0,1,0,4,3,0,2,-1], // 249
  [8,10,2,8,2,3,9,0,5,-1], // 250
  [0,9,1,10,2,3,-1], // 251
  [3,10,2,3,2,7,10,9,2,0,2,9,-1], // 252
  [9,7,8,0,7,9,2,3,10,-1], // 253
  [9,5,7,9,7,1,7,3,1,-1], // 254
  [0,7,8,0,1,7,1,5,7,-1], // 255
];

// Vertex positions for each edge of a unit cube [0,1]^3
const edges = [
  [0,1], [1,2], [2,3], [3,0], // bottom square
  [4,5], [5,6], [6,7], [7,4], // top square
  [0,4], [1,5], [2,6], [3,7]  // vertical edges
];

// ─── Marching Cubes Core ─────────────────────────────────────────────────────

function linearInterp(p1, p2, v1, v2, iso) {
  if (Math.abs(iso - v1) < 1e-6) return p1.slice();
  if (Math.abs(iso - v2) < 1e-6) return p2.slice();
  if (Math.abs(v1 - v2) < 1e-6) return p1.slice();
  const t = (iso - v1) / (v2 - v1);
  return [
    p1[0] + t * (p2[0] - p1[0]),
    p1[1] + t * (p2[1] - p1[1]),
    p1[2] + t * (p2[2] - p1[2])
  ];
}

function marchingCubes(resolution, isolevel, getDensity) {
  const pos = [];
  const nor = [];
  const idx = [];
  const scale = 1.0 / resolution;

  const corners = [
    [0,0,0],[1,0,0],[1,1,0],[0,1,0],
    [0,0,1],[1,0,1],[1,1,1],[0,1,1]
  ];

  // Precompute corner offsets in world space
  const cornerOffsets = corners.map(c => [c[0]*scale, c[1]*scale, c[2]*scale]);

  for (let iz = 0; iz < resolution; iz++) {
    for (let iy = 0; iy < resolution; iy++) {
      for (let ix = 0; ix < resolution; ix++) {
        // Base world position of this voxel
        const bx = ix * scale;
        const by = iy * scale;
        const bz = iz * scale;

        // Sample scalar field at all 8 corners of this voxel
        const vals = new Array(8);
        for (let c = 0; c < 8; c++) {
          const ox = cornerOffsets[c][0];
          const oy = cornerOffsets[c][1];
          const oz = cornerOffsets[c][2];
          vals[c] = getDensity(bx + ox, by + oy, bz + oz);
        }

        // Determine which corners are inside the iso-surface
        let cubeIdx = 0;
        for (let c = 0; c < 8; c++) {
          if (vals[c] >= isolevel) cubeIdx |= (1 << c);
        }

        if (cubeIdx === 0 || cubeIdx === 255) continue;

        const e = edgeTable[cubeIdx];
        if (e === 0) continue;

        // Compute vertex positions on intersected edges
        const vertList = new Array(12);
        for (let edge = 0; edge < 12; edge++) {
          if ((e & (1 << edge)) !== 0) {
            const [c1, c2] = edges[edge];
            const p1 = [bx + cornerOffsets[c1][0], by + cornerOffsets[c1][1], bz + cornerOffsets[c1][2]];
            const p2 = [bx + cornerOffsets[c2][0], by + cornerOffsets[c2][1], bz + cornerOffsets[c2][2]];
            vertList[edge] = linearInterp(p1, p2, vals[c1], vals[c2], isolevel);
          } else {
            vertList[edge] = null;
          }
        }

        // Generate triangles
        const tris = triTable[cubeIdx];
        for (let t = 0; t < tris.length; t += 3) {
          if (tris[t] === -1) break;
          const a = tris[t], b = tris[t+1], c = tris[t+2];
          if (vertList[a] && vertList[b] && vertList[c]) {
            const base = pos.length / 3;
            pos.push(...vertList[a]);
            pos.push(...vertList[b]);
            pos.push(...vertList[c]);

            // Approximate normal via cross product
            const va = vertList[a], vb = vertList[b], vc = vertList[c];
            const ax = vb[0]-va[0], ay = vb[1]-va[1], az = vb[2]-va[2];
            const bx = vc[0]-va[0], by = vc[1]-va[1], bz = vc[2]-va[2];
            const nx = ay*bz - az*by;
            const ny = az*bx - ax*bz;
            const nz = ax*by - ay*bx;
            const nl = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
            nor.push(nx/nl, ny/nl, nz/nl);
            nor.push(nx/nl, ny/nl, nz/nl);
            nor.push(nx/nl, ny/nl, nz/nl);

            idx.push(base, base+1, base+2);
          }
        }
      }
    }
  }

  return { positions: pos, normals: nor, indices: idx };
}

// ─── Scene Setup ─────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.15);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(2.5, 1.8, 3.0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0.5, 0.5, 0.5);
controls.minDistance = 1.0;
controls.maxDistance = 8.0;

// ─── Lighting ─────────────────────────────────────────────────────────────────

const ambient = new THREE.AmbientLight(0x404060, 1.5);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(3, 5, 4);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
scene.add(dirLight);

const pointLight = new THREE.PointLight(0x4488ff, 2.0, 8);
pointLight.position.set(-2, 2, -2);
scene.add(pointLight);

// ─── Grid Plane ───────────────────────────────────────────────────────────────

const gridHelper = new THREE.GridHelper(4, 40, 0x1a1a2e, 0x1a1a2e);
gridHelper.position.y = -0.01;
scene.add(gridHelper);

const groundGeo = new THREE.PlaneGeometry(4, 4);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x0d0d1a,
  roughness: 0.9,
  metalness: 0.1,
  transparent: true,
  opacity: 0.6,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground);

// ─── Metaball System ──────────────────────────────────────────────────────────

class Metaball {
  constructor(index, total) {
    this.index = index;
    this.phase = (index / total) * Math.PI * 2;
    this.speed = 0.3 + Math.random() * 0.4;
    this.radius = 0.08 + Math.random() * 0.06;
    this.orbitRadius = 0.15 + Math.random() * 0.25;
    this.orbitTilt = (Math.random() - 0.5) * 1.2;
    this.growSpeed = 0.05 + Math.random() * 0.1;
    this.growPhase = Math.random() * Math.PI * 2;
    this.x = 0; this.y = 0; this.z = 0;
    this.r = this.radius;

    // Color varies per ball
    const hue = (index / total) * 0.6 + 0.55;
    this.color = new THREE.Color().setHSL(hue, 0.8, 0.55);

    // Create small sphere mesh for visualization
    const geo = new THREE.SphereGeometry(this.radius, 16, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.5,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
  }

  update(t) {
    const s = this.speed;
    const ax = this.orbitRadius;
    const ay = this.orbitRadius * 0.7;
    const az = this.orbitRadius * 0.5;

    this.x = 0.5 + ax * Math.cos(t * s + this.phase) * Math.cos(this.orbitTilt);
    this.y = 0.5 + ay * Math.sin(t * s * 0.7 + this.phase * 1.3);
    this.z = 0.5 + az * Math.sin(t * s + this.phase) * Math.sin(this.orbitTilt);

    // Pulsing radius
    this.r = this.radius * (0.8 + 0.4 * Math.sin(t * this.growSpeed * 3 + this.growPhase));

    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.scale.setScalar(this.r / this.radius);
  }

  density(px, py, pz) {
    const dx = px - this.x;
    const dy = py - this.y;
    const dz = pz - this.z;
    const dist2 = dx*dx + dy*dy + dz*dz;
    const eps = 0.001;
    return (this.r * this.r) / (dist2 + eps);
  }

  dispose() {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

// ─── Mesh Management ─────────────────────────────────────────────────────────

const meshMaterial = new THREE.MeshStandardMaterial({
  color: 0x7dd3fc,
  roughness: 0.35,
  metalness: 0.3,
  side: THREE.DoubleSide,
  flatShading: false,
});

const wireMaterial = new THREE.MeshBasicMaterial({
  color: 0x7dd3fc,
  wireframe: true,
  transparent: true,
  opacity: 0.35,
});

let isoMesh = null;
let wireMesh = null;

function buildMesh(resolution, isolevel, metaballs) {
  const getDensity = (px, py, pz) => {
    let d = 0;
    for (const b of metaballs) d += b.density(px, py, pz);
    return d;
  };

  const geo = new THREE.BufferGeometry();
  const { positions, normals, indices } = marchingCubes(resolution, isolevel, getDensity);

  if (positions.length === 0) {
    geo.setIndex([]);
    geo.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute([], 3));
  } else {
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
  }

  // Smooth shading: recalculate normals
  if (positions.length > 0) {
    geo.computeVertexNormals();
  }

  // Replace existing mesh
  if (isoMesh) {
    scene.remove(isoMesh);
    isoMesh.geometry.dispose();
  }
  isoMesh = new THREE.Mesh(geo, meshMaterial);
  isoMesh.castShadow = true;
  isoMesh.receiveShadow = true;
  scene.add(isoMesh);

  // Wireframe overlay
  if (wireMesh) {
    scene.remove(wireMesh);
    wireMesh.geometry.dispose();
  }
  const wgeo = geo.clone();
  wireMesh = new THREE.Mesh(wgeo, wireMaterial);
  wireMesh.visible = document.getElementById('wireframe').checked;
  scene.add(wireMesh);
}

// ─── Metaball Management ───────────────────────────────────────────────────────

let metaballs = [];

function setMetaballCount(n) {
  // Dispose old
  for (const b of metaballs) b.dispose();
  metaballs = [];
  for (let i = 0; i < n; i++) {
    metaballs.push(new Metaball(i, n));
  }
}

setMetaballCount(6);

// ─── UI State ─────────────────────────────────────────────────────────────────

let resolution = 48;
let isolevel = 1.0;
let wireframeMode = false;
let lastRebuild = 0;
let rebuildPending = false;
let rebuildCounter = 0;

function scheduleRebuild() {
  rebuildPending = true;
}

document.getElementById('resolution').addEventListener('input', e => {
  resolution = parseInt(e.target.value);
  document.getElementById('resVal').textContent = resolution;
  scheduleRebuild();
});

document.getElementById('isolevel').addEventListener('input', e => {
  isolevel = parseFloat(e.target.value);
  document.getElementById('isoVal').textContent = isolevel.toFixed(1);
  scheduleRebuild();
});

document.getElementById('metaballs').addEventListener('input', e => {
  const n = parseInt(e.target.value);
  document.getElementById('ballVal').textContent = n;
  setMetaballCount(n);
  scheduleRebuild();
});

document.getElementById('wireframe').addEventListener('change', e => {
  wireframeMode = e.target.checked;
  if (wireMesh) wireMesh.visible = wireframeMode;
});

// ─── Resize ────────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Animation Loop ───────────────────────────────────────────────────────────

let lastTime = 0;
let frameCount = 0;
let fpsTime = 0;
const fpsEl = document.getElementById('fps');

function animate(time) {
  requestAnimationFrame(animate);

  const t = time * 0.001;
  const dt = t - lastTime;
  lastTime = t;

  // FPS counter
  frameCount++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    const fps = Math.round(frameCount / fpsTime);
    fpsEl.textContent = `${fps} fps`;
    frameCount = 0;
    fpsTime = 0;
  }

  // Update metaballs
  for (const b of metaballs) b.update(t);

  // Animate point light
  pointLight.position.x = 2 * Math.cos(t * 0.5);
  pointLight.position.z = 2 * Math.sin(t * 0.5);

  // Rebuild mesh (throttled by rebuild counter to avoid frame drops)
  if (rebuildPending) {
    rebuildCounter++;
    if (rebuildCounter >= 2) { // rebuild every 2nd frame when pending
      rebuildPending = false;
      rebuildCounter = 0;
    }
    buildMesh(resolution, isolevel, metaballs);
  }

  controls.update();
  renderer.render(scene, camera);
}

// Initial build
buildMesh(resolution, isolevel, metaballs);

// Attach to window for debugging
window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.controls = controls;
window.isoMesh = null; // updated in buildMesh

// Override buildMesh to expose isoMesh
const _origBuild = buildMesh;
buildMesh = function(res2, iso2, balls2) {
  _origBuild(res2, iso2, balls2);
  window.isoMesh = isoMesh;
  window.metaballs = metaballs;
};

animate(0);