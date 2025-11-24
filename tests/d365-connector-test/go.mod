module github.com/purehospitality/amicis-solution-accelerator/tests/d365-connector-test

go 1.21

require (
	github.com/joho/godotenv v1.5.1
	github.com/purehospitality/amicis-solution-accelerator/backend/go-routing-service/adapters/d365 v0.0.0-00010101000000-000000000000
	github.com/stretchr/testify v1.8.4
)

require (
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)

// Use local d365 adapter package
replace github.com/purehospitality/amicis-solution-accelerator/backend/go-routing-service/adapters/d365 => ../../backend/go-routing-service/adapters/d365
