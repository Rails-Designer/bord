Bord.draw do
  title "Spinal Labs"

  category :financials, label: "Financials", position: 1 do
    metric :mrr, label: "MRR", value: -> { "$28,400" }, href: "/bord/pages/charges"
    metric :arr, label: "ARR", value: -> { "$340,800" }
    metric :revenue_today, label: "Revenue today", value: -> { "$1,240" }
    metric :churn, label: "Churn", value: -> { "1.8%" }

    list :recent_charges,
      label: "Recent charges",
      items: -> {
        (1..3).map do |index|
          charge = Charge.new(index)
          {
            label: charge.label,
            href: bord.page_record_path(:charges, charge.id),
            actions: [
              {label: "View", href: bord.page_record_path(:charges, charge.id)},
              {label: "Refund", confirm: "Refund this charge?", variant: :danger,
                action: {record: charge.to_gid.to_s, method: :refund, customer_id: charge.id}}
            ]
          }
        end
      },
      actions: [{label: "View all", href: "/bord/pages/charges"}]
  end

  category :customers, label: "Customers", position: 2 do
    list :recent_customers,
      label: "Recent customers",
      items: -> {
        Customer.recent(5).map { it.to_bord.merge(href: bord.page_record_path(:customers, it.id)) }
      },
      actions: [{label: "View all", href: "/bord/pages/customers"}]

    metric :trials, label: "Trials", value: -> { "24" }
  end

  category :operations, label: "Operations", position: 3 do
    list :recent_jobs,
      label: "Latest failures",
      items: -> {
        Job.recent(4).map do |job|
          {
            label: job.label,
            actions: [{label: "Retry", action: {record: job.to_gid.to_s, method: :reenqueue}}]
          }
        end
      }

    metric :failed_jobs, label: "Failed jobs", value: -> { "4" }
  end

  page :customers,
    label: "Customers",
    description: "All customers with quick actions",
    records: -> {
      Customer.all.map do |customer|
        {
          title: customer.name,
          description: "#{customer.plan} plan",
          actions: [{label: "View", href: bord.page_record_path(:customers, customer.id)}]
        }
      end
    },
    record: ->(id) {
      customer = Customer.find(id)
      {
        title: customer.name,
        description: customer.email,
        fields: [
          {label: "Plan", value: customer.plan},
          {label: "MRR", value: customer.mrr},
          {label: "Customer since", value: customer.since}
        ],
        actions: [
          {label: "Impersonate", confirm: "Log in as this customer?",
            action: {record: customer.to_gid.to_s, method: :impersonate}}
        ]
      }
    }

  page :charges,
    label: "Charges",
    description: "All charges with quick actions",
    records: -> {
      (1..5).map do |index|
        charge = Charge.new(index)
        {
          title: charge.label,
          description: "Created on June #{index}, 2026",
          actions: [
            {label: "View", href: bord.page_record_path(:charges, index)},
            {label: "Refund", confirm: "Refund this charge?", variant: :danger,
              action: {record: charge.to_gid.to_s, method: :refund, customer_id: index}}
          ]
        }
      end
    },
    record: ->(id) {
      charge = Charge.find(id)
      {
        title: charge.label,
        description: "A test charge record",
        fields: [
          {label: "ID", value: charge.id},
          {label: "Amount", value: "$100.00"}
        ],
        actions: [
          {label: "Refund", confirm: "Refund this charge?", variant: :danger,
            action: {record: charge.to_gid.to_s, method: :refund, customer_id: charge.id}}
        ]
      }
    }
end
