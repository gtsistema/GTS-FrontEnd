/**
 * Rotas relativas a `{API_BASE}/Estacionamento/` conforme Swagger publicado
 * (https://gtsbackend.azurewebsites.net/swagger/v1/swagger.json).
 */
export const EstacionamentoPaths = {
  buscar: 'Buscar',
  obterPorId: (id: number) => `ObterPorId/${id}`,
  gravar: 'Gravar',
  alterar: 'Alterar',
  excluir: (id: number) => `Delete/${id}`,
  /** GET — lista fotos do estacionamento */
  buscarFotos: (id: number) => `BuscarFotos/buscar-fotos/${id}`,
  /** POST multipart: EstacionamentoId, Fotos[] */
  uploadFotos: 'UploadFotos/upload-fotos',
  /** DELETE — remove foto por id */
  deletarFoto: (fotoId: number) => `DeletarFotos/deletar-fotos/${fotoId}`,
} as const;
