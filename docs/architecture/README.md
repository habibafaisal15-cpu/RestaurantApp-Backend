# Architecture

## System overview

```
┌─────────────────────┐     REST + WebSocket     ┌─────────────────────┐
│  Customer Frontend  │ ◄──────────────────────► │                     │
│  (React)            │                          │      Backend        │
└─────────────────────┘                          │   (Node.js API)     │
                                                 │                     │
┌─────────────────────┐     REST + WebSocket     │                     │
│  Restaurant Admin   │ ◄──────────────────────► │                     │
│  Frontend (React)   │                          └──────────┬──────────┘
└─────────────────────┘                                     │
                                                            ▼
                                                   ┌─────────────────┐
                                                   │    Database     │
                                                   └─────────────────┘
```

## Order lifecycle

```
New → Accepted → Preparing → Rider Assigned → Out for Delivery → Delivered
         ↓              ↓                              ↓
     Rejected       Cancelled                    Failed Delivery
```

## Real-time sync

Every status change on the restaurant admin side is:

1. Written to `delivery_orders` + `order_tracking_logs`
2. Broadcast via WebSocket to the customer tracking session
3. Optionally triggers SMS / push notification
