export const worlds = [
  { id:'ember', name:'赤脊星', biome:'赤铁峡谷', radius:2420, center:[0,-2420,0], seed:11,
    rock:'#703f2d', dust:'#a37748', frost:'#d4ba82', air:'#ff934e', accent:'#ffb27a' },
  { id:'rime', name:'霜镜', biome:'冰原与玄武岩', radius:1960, center:[12760,7420,-12800], seed:43,
    rock:'#304454', dust:'#718b97', frost:'#b9d8dd', air:'#66aed9', accent:'#9ae9ff' },
  { id:'veil', name:'翡翠幕', biome:'层状矿脊', radius:3260, center:[-15800,8890,-17200], seed:91,
    rock:'#344239', dust:'#687a50', frost:'#b1ac73', air:'#88d189', accent:'#bae888' },
];
export const materials = {
  iron:{ name:'铁矿', color:'#e99b70' },
  silica:{ name:'硅砂', color:'#94d6e5' },
  crystal:{ name:'辉晶', color:'#d0e685' },
  alloy:{ name:'合金', color:'#e2b681' },
  fuel:{ name:'燃料', color:'#f6d998' },
};
export const blueprints = [
  { id:'core', name:'基地信标', detail:'标记这片地面，开放周围 70 米的建造。', cost:{iron:4,silica:2}, radius:2.6 },
  { id:'solar', name:'太阳能阵列', detail:'给同一基地的制造台和舱室供电。', cost:{iron:3,silica:4}, radius:3.2 },
  { id:'bench', name:'制造工坊', detail:'接入太阳能后可冶炼合金和合成燃料。', cost:{iron:5,silica:3}, radius:3.7 },
  { id:'hab', name:'居住舱', detail:'接入电力后可在舱内补充宇航服能源。', cost:{alloy:2,silica:5}, radius:4.7 },
  { id:'pad', name:'着陆平台', detail:'为飞船提供标记点，补给时更易找到基地。', cost:{alloy:3,iron:5}, radius:5.6 },
];
export const recipes = [
  {id:'alloy', name:'冶炼合金', cost:{iron:3,silica:1}, result:{alloy:2}},
  {id:'fuel', name:'合成燃料', cost:{crystal:2,silica:1}, result:{fuel:3}},
];
export const costLabel = costs => Object.entries(costs).map(([id,n])=>`${materials[id].name} ×${n}`).join(' · ');
