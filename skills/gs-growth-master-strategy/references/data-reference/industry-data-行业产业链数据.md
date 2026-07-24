# 产业链 / 行业产业链数据

---

## 输出框架

产业链模块固定返回以下 4 类信息：

| 返回模块 | 对应含义 | 对应接口 |
|----------|----------|----------|
| 产业信息 | 行业/产业链节点、行业代码、层级、父级/祖先分类 | `chain/industry-info` |
| 产品信息 | 产品代码、产品名称、所属行业、产品层级、父级产品 | `chain/product-info` |
| 上下游关系 | 产品之间的上游/下游关系，用于梳理链条 | `chain/pro-relation` |
| 公司相关产业链图谱 | 公司覆盖的产业链环节、相关产品/行业映射 | `chain/pro-ind-maps` |

推荐输出顺序：

1. 先给产业链摘要：产业节点、关键产品、上下游方向。
2. 再分表展示产业信息、产品信息、上下游关系。
3. 如果用户提供公司名称或股票代码，再补公司相关产业链图谱。
4. 末尾标注口径：行业口径、产品口径或公司口径。

## 产业信息

接口路径：`chain/industry-info`  
请求方式：**`POST`**

接口说明：通过行业代码或行业名称查询产业链行业分类信息，返回行业代码、名称、父级代码、祖先代码、分类体系和行业层级。

**接口示例**

```bash
node scripts/gs-api.js chain/industry-info --method POST --body-json '{"industryCode":"640000"}'
```

## 产品信息

接口路径：`chain/product-info`  
请求方式：**`POST`**

接口说明：通过产品代码或产品名称查询供应链产品信息，返回产品代码、产品名称、所属行业代码、产品层级和父级产品代码。

**接口示例**

```bash
node scripts/gs-api.js chain/product-info --method POST --body-json '{"productCode":"P0007786","pageNum":1,"pageSize":20}'
```

## 产品上下游关系

接口路径：`chain/pro-relation`  
请求方式：**`POST`**

接口说明：查询产品之间的上下游关系，可用于构建行业产品链条和上下游关系图。

**接口示例**

```bash
node scripts/gs-api.js chain/pro-relation --method POST --body-json '{"productCode":"P0007786","pageNum":1,"pageSize":20}'
```

## 公司相关产业链图谱

接口路径：`chain/pro-ind-maps`  
请求方式：**`POST`**

接口说明：查询公司相关产业链图谱，适合在用户给出股票代码或代表公司时，补充公司在产业链中的位置。

**接口示例**

```bash
node scripts/gs-api.js chain/pro-ind-maps --method POST --body-json '{"stockCodes":["600519"],"pageNum":1,"pageSize":20}'
```

**使用建议**

- 用户只问行业产业链时，优先返回产业信息、产品信息和上下游关系。
- 用户给出公司名称、股票代码或代表公司时，再返回公司相关产业链图谱。
- 公司相关产业链图谱是公司维度，不是纯行业维度；输出时必须标注“公司口径”。
- 若用户只给行业名称且无法定位代表公司，不应编造公司产业链图谱。
