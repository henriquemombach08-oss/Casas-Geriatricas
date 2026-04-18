import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CasaGeri API',
      version: '1.0.0',
      description:
        'API REST para o sistema de gestão de casas geriátricas CasaGeri. ' +
        'Gerencia residentes, medicações, visitantes, finanças, escalas e relatórios.',
    },
    servers: [{ url: '/api', description: 'API Base' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            status: { type: 'integer' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: {
              type: 'string',
              enum: ['admin', 'director', 'nurse', 'caregiver', 'admin_finance', 'cook', 'other'],
            },
            houseId: { type: 'string', format: 'uuid' },
            phone: { type: 'string' },
            active: { type: 'boolean' },
          },
        },
        Resident: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            houseId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            birthDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['active', 'inactive', 'hospitalized', 'deceased'] },
            roomNumber: { type: 'string' },
            admissionDate: { type: 'string', format: 'date' },
            notes: { type: 'string' },
          },
        },
        Medication: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            residentId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            dosage: { type: 'string' },
            frequency: { type: 'string' },
            status: { type: 'string', enum: ['active', 'suspended', 'finished'] },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date', nullable: true },
          },
        },
        Visitor: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            residentId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            relationship: { type: 'string' },
            visitDate: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
          },
        },
        Financial: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            residentId: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['income', 'expense'] },
            amount: { type: 'number', format: 'float' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date' },
          },
        },
        Schedule: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            date: { type: 'string', format: 'date' },
            shift: { type: 'string', enum: ['morning', 'afternoon', 'night'] },
            notes: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Autenticação e gerenciamento de sessão' },
      { name: 'Residents', description: 'Gerenciamento de residentes' },
      { name: 'Medications', description: 'Medicações e registros de administração' },
      { name: 'Visitors', description: 'Registro de visitas' },
      { name: 'Staff', description: 'Gerenciamento de funcionários' },
      { name: 'Financial', description: 'Movimentações financeiras por residente' },
      { name: 'Schedules', description: 'Escalas de trabalho' },
      { name: 'Reports', description: 'Relatórios e dashboards' },
      { name: 'Documents', description: 'Documentos e anexos' },
    ],
    paths: {
      // ── Auth ──────────────────────────────────────────────────────────────────
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Autenticar usuário',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'admin@casageri.com' },
                    password: { type: 'string', minLength: 8, example: 'senha1234' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login bem-sucedido',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' },
                          refreshToken: { type: 'string' },
                          user: { $ref: '#/components/schemas/User' },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { description: 'Credenciais inválidas' },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Registrar novo usuário',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['houseId', 'email', 'password', 'name', 'role'],
                  properties: {
                    houseId: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    name: { type: 'string', minLength: 2 },
                    role: {
                      type: 'string',
                      enum: ['admin', 'director', 'nurse', 'caregiver', 'admin_finance'],
                    },
                    phone: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Usuário criado com sucesso' },
            409: { description: 'Email já cadastrado' },
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Encerrar sessão',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Logout realizado com sucesso' },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Renovar access token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: {
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Tokens renovados',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' },
                          refreshToken: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { description: 'Refresh token inválido ou expirado' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Obter dados do usuário autenticado',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Dados do usuário',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { $ref: '#/components/schemas/User' } },
                  },
                },
              },
            },
            401: { description: 'Não autenticado' },
          },
        },
      },
      // ── Residents ─────────────────────────────────────────────────────────────
      '/residents': {
        get: {
          tags: ['Residents'],
          summary: 'Listar residentes',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive', 'hospitalized', 'deceased'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            200: {
              description: 'Lista de residentes',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Resident' } },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Residents'],
          summary: 'Cadastrar residente',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Resident' },
              },
            },
          },
          responses: {
            201: { description: 'Residente criado com sucesso' },
          },
        },
      },
      '/residents/{id}': {
        get: {
          tags: ['Residents'],
          summary: 'Obter residente por ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: {
              description: 'Dados do residente',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Resident' } } },
                },
              },
            },
            404: { description: 'Residente não encontrado' },
          },
        },
        put: {
          tags: ['Residents'],
          summary: 'Atualizar residente',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Resident' },
              },
            },
          },
          responses: {
            200: { description: 'Residente atualizado com sucesso' },
            404: { description: 'Residente não encontrado' },
          },
        },
        delete: {
          tags: ['Residents'],
          summary: 'Remover residente',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Residente removido com sucesso' },
            404: { description: 'Residente não encontrado' },
          },
        },
      },
      // ── Staff / Users ─────────────────────────────────────────────────────────
      '/users': {
        get: {
          tags: ['Staff'],
          summary: 'Listar funcionários',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'active', in: 'query', schema: { type: 'boolean' } },
            {
              name: 'role',
              in: 'query',
              schema: { type: 'string', enum: ['admin', 'director', 'nurse', 'caregiver', 'admin_finance', 'cook', 'other'] },
            },
          ],
          responses: {
            200: {
              description: 'Lista de funcionários',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { type: 'array', items: { $ref: '#/components/schemas/User' } } },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Staff'],
          summary: 'Cadastrar funcionário',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name', 'role'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                    name: { type: 'string' },
                    role: {
                      type: 'string',
                      enum: ['admin', 'director', 'nurse', 'caregiver', 'admin_finance', 'cook', 'other'],
                    },
                    phone: { type: 'string' },
                    customRole: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Funcionário criado com sucesso' },
          },
        },
      },
      '/users/{id}': {
        put: {
          tags: ['Staff'],
          summary: 'Atualizar funcionário',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/User' } },
            },
          },
          responses: {
            200: { description: 'Funcionário atualizado com sucesso' },
            404: { description: 'Funcionário não encontrado' },
          },
        },
        delete: {
          tags: ['Staff'],
          summary: 'Desativar funcionário',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Funcionário desativado com sucesso' },
            404: { description: 'Funcionário não encontrado' },
          },
        },
      },
      // ── Medications ───────────────────────────────────────────────────────────
      '/medications': {
        get: {
          tags: ['Medications'],
          summary: 'Listar medicações',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'residentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'suspended', 'finished'] } },
          ],
          responses: {
            200: {
              description: 'Lista de medicações',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Medication' } } },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Medications'],
          summary: 'Cadastrar medicação',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Medication' } },
            },
          },
          responses: {
            201: { description: 'Medicação criada com sucesso' },
          },
        },
      },
      '/medications/scheduled/next': {
        get: {
          tags: ['Medications'],
          summary: 'Próximas medicações agendadas',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Lista de próximas administrações agendadas' },
          },
        },
      },
      '/medications/{id}': {
        put: {
          tags: ['Medications'],
          summary: 'Atualizar medicação',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Medication' } },
            },
          },
          responses: {
            200: { description: 'Medicação atualizada com sucesso' },
            404: { description: 'Medicação não encontrada' },
          },
        },
        delete: {
          tags: ['Medications'],
          summary: 'Remover medicação',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Medicação removida com sucesso' },
            404: { description: 'Medicação não encontrada' },
          },
        },
      },
      '/medication-logs': {
        get: {
          tags: ['Medications'],
          summary: 'Listar registros de administração de medicação',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'residentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
          responses: {
            200: { description: 'Lista de registros de administração' },
          },
        },
        post: {
          tags: ['Medications'],
          summary: 'Registrar administração de medicação',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['medicationId', 'administeredAt'],
                  properties: {
                    medicationId: { type: 'string', format: 'uuid' },
                    administeredAt: { type: 'string', format: 'date-time' },
                    administeredBy: { type: 'string', format: 'uuid' },
                    notes: { type: 'string' },
                    skipped: { type: 'boolean' },
                    skipReason: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Registro criado com sucesso' },
          },
        },
      },
      // ── Visitors ──────────────────────────────────────────────────────────────
      '/visitors': {
        get: {
          tags: ['Visitors'],
          summary: 'Listar visitas',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'residentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'Lista de visitas',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Visitor' } } },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Visitors'],
          summary: 'Registrar visita',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Visitor' } },
            },
          },
          responses: {
            201: { description: 'Visita registrada com sucesso' },
          },
        },
      },
      '/visitors/{id}': {
        put: {
          tags: ['Visitors'],
          summary: 'Atualizar visita',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Visitor' } },
            },
          },
          responses: {
            200: { description: 'Visita atualizada com sucesso' },
            404: { description: 'Visita não encontrada' },
          },
        },
      },
      // ── Financial ─────────────────────────────────────────────────────────────
      '/financial/resident/{residentId}': {
        get: {
          tags: ['Financial'],
          summary: 'Listar movimentações financeiras de um residente',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'residentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'month', in: 'query', schema: { type: 'string', example: '2026-04' } },
          ],
          responses: {
            200: {
              description: 'Lista de movimentações',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Financial' } } },
                  },
                },
              },
            },
          },
        },
      },
      '/financial': {
        post: {
          tags: ['Financial'],
          summary: 'Registrar movimentação financeira',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Financial' } },
            },
          },
          responses: {
            201: { description: 'Movimentação registrada com sucesso' },
          },
        },
      },
      '/financial/{id}': {
        put: {
          tags: ['Financial'],
          summary: 'Atualizar movimentação financeira',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Financial' } },
            },
          },
          responses: {
            200: { description: 'Movimentação atualizada com sucesso' },
            404: { description: 'Movimentação não encontrada' },
          },
        },
      },
      // ── Schedules ─────────────────────────────────────────────────────────────
      '/schedules': {
        get: {
          tags: ['Schedules'],
          summary: 'Listar escalas de trabalho',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'month', in: 'query', schema: { type: 'string', example: '2026-04' } },
          ],
          responses: {
            200: {
              description: 'Lista de escalas',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Schedule' } } },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Schedules'],
          summary: 'Criar escala de trabalho',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Schedule' } },
            },
          },
          responses: {
            201: { description: 'Escala criada com sucesso' },
          },
        },
      },
      '/schedules/{id}': {
        put: {
          tags: ['Schedules'],
          summary: 'Atualizar escala de trabalho',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Schedule' } },
            },
          },
          responses: {
            200: { description: 'Escala atualizada com sucesso' },
            404: { description: 'Escala não encontrada' },
          },
        },
      },
      // ── Reports ───────────────────────────────────────────────────────────────
      '/reports/medications/dashboard': {
        get: {
          tags: ['Reports'],
          summary: 'Dashboard de medicações',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'month', in: 'query', schema: { type: 'string', example: '2026-04' } },
          ],
          responses: {
            200: { description: 'Dados do dashboard de medicações' },
          },
        },
      },
      '/reports/residents/dashboard': {
        get: {
          tags: ['Reports'],
          summary: 'Dashboard de residentes',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Dados do dashboard de residentes' },
          },
        },
      },
      '/reports/financial/dashboard': {
        get: {
          tags: ['Reports'],
          summary: 'Dashboard financeiro',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'period',
              in: 'query',
              schema: { type: 'string', enum: ['month', 'quarter', 'year'], default: 'month' },
            },
          ],
          responses: {
            200: { description: 'Dados do dashboard financeiro' },
          },
        },
      },
      '/reports/staff/dashboard': {
        get: {
          tags: ['Reports'],
          summary: 'Dashboard de funcionários',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'month', in: 'query', schema: { type: 'string', example: '2026-04' } },
          ],
          responses: {
            200: { description: 'Dados do dashboard de funcionários' },
          },
        },
      },
    },
  },
  apis: [], // All paths defined inline above
};

export const swaggerSpec = swaggerJsdoc(options);
