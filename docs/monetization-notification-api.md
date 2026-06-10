# Monetization Status Notification API

## Endpoint

```
POST /domain-monetstatus-notice
```

## Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |

## Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| domain | string | Yes | The domain name to flag |
| status | string | Yes | Must be `"flag"` |

## Request Example

```json
{
  "domain": "example.com",
  "status": "flag"
}
```

## Response

### Success

```json
{
  "code": 200,
  "data": "received"
}
```

### Bad Request - Missing Fields

```json
{
  "code": 400,
  "error": "Bad Request",
  "message": "Fields \"domain\" and \"status\" are required. Please send a JSON body: { \"domain\": \"example.com\", \"status\": \"flag\" } with Content-Type: application/json"
}
```

### Bad Request - Invalid Status

```json
{
  "code": 400,
  "error": "Bad Request",
  "message": "Invalid status value. Only \"flag\" is accepted."
}
```

### Internal Server Error

```json
{
  "code": 500,
  "error": "Internal Server Error",
  "message": "Failed to process the notification. Please try again later."
}
```

## cURL Example

```bash
curl -X POST https://efbox.work/api/domain-monetstatus-notice \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com", "status": "flag"}'
```

## Notes

- No authentication required for this endpoint.
- Only `"flag"` is accepted as the status value. Any other value will be rejected.
